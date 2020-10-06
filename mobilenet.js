const fs = require('fs').promises
const Redis = require('ioredis')
const Jimp = require('jimp')

const MODEL_PATH = 'models/mobilenet_v2_1.4_224_frozen.pb'
const MODEL_INPUT_NODES_NAME = 'input'
const MODEL_OUTPUT_NODES_NAME = 'MobilenetV2/Predictions/Reshape_1'

const LABELS_PATH = 'labels.json'

const MODEL_KEY = 'mobilenet'
const INPUT_TENSOR_KEY = 'mobilenet_input'
const OUTPUT_TENSOR_KEY = 'mobilenet_output'

const IMAGE_HEIGHT = 224
const IMAGE_WIDTH = 224
const IMAGE_DEPTH = 3

const TOP_COUNT = 5

async function main() {

  let [, , ...paths] = Array.from(process.argv)
  let labels = JSON.parse(await fs.readFile(LABELS_PATH))

  let imageCount = paths.length
  let labelCount = labels.length

  let inputShape = [imageCount, IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_DEPTH]
  let outputShape = [imageCount, labelCount]

  // connect to redis
  let redis = new Redis()

  // read the model
  let blob = await fs.readFile(MODEL_PATH)

  // set the model
  console.log("Setting the model to", MODEL_KEY)
  await redis.call('AI.MODELSET', MODEL_KEY, 'TF', 'CPU',
    'INPUTS', MODEL_INPUT_NODES_NAME,
    'OUTPUTS', MODEL_OUTPUT_NODES_NAME,
    'BLOB', blob)

  // fetch the image data
  let imageBuffers = await Promise.all(
    paths.map(async path => {

      // load and resize image
      console.log("Reading and resizing", path)
      let image = await Jimp.read(path)
      let resizedImage = image.cover(IMAGE_WIDTH, IMAGE_HEIGHT)
      let imageBytes = Array.from(resizedImage.bitmap.data)

      // normalize image data
      console.log("Normalizing image data")
      let rgbBytes = imageBytes.filter((byte, index) => (index + 1) % 4 !== 0)
      let rgbFloats = Float32Array.from(rgbBytes.map(byte => byte / 127.5 - 1))
      let imageBuffer = Buffer.from(rgbFloats.buffer)

      // return the buffer
      return imageBuffer
    })
  )

  // merge the image buffers
  let imageData = Buffer.concat(imageBuffers)

  // place normalized images in input tensor
  console.log("Setting input tensor of shape", inputShape)
  await redis.call('AI.TENSORSET', INPUT_TENSOR_KEY,
                   'FLOAT', ...inputShape,
                   'BLOB', imageData)

  // infer
  console.log("Running model")
  await redis.call('AI.MODELRUN', MODEL_KEY,
                   'INPUTS', INPUT_TENSOR_KEY,
                   'OUTPUTS', OUTPUT_TENSOR_KEY)

  // read the output tensor
  console.log("Reading output tensor of shape", outputShape)
  let buffer = await redis.callBuffer('AI.TENSORGET', OUTPUT_TENSOR_KEY, 'BLOB')

  // turn the tensor into an array
  let array = new Array(outputShape[0]).fill().map((_, i) => {
    return new Array(outputShape[1]).fill().map((_, j) => {
      return buffer.readFloatLE(outputShape[1] * i * 4 + j * 4)
    })
  })

  // decode and rank the classifications
  console.log("Decoding results")
  let results = array.map(row => {
    return row
      .map((score, index) => ({ label: labels[index], score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_COUNT)
  })

  // report the results
  console.log()
  results.forEach((row, index) => {
    console.table(row)
    console.log(paths[index])
    console.log()
  })

  // close up redis
  redis.quit()
}

main()
