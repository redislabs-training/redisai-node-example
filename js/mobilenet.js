let fs = require('fs').promises

let Redis = require('ioredis')
let Jimp = require('jimp')

const MODEL_PATH = '../models/mobilenet_v2_1.4_224_frozen.pb'
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

  let imagePaths = fetchImagePaths()
  let labels = await fetchLabels()

  let imageCount = imagePaths.length
  let labelCount = labels.length

  let inputShape = [imageCount, IMAGE_WIDTH, IMAGE_HEIGHT, IMAGE_DEPTH]
  let outputShape = [imageCount, labelCount]

  // connect to redis
  let redis = new Redis()

  // read the model
  let modelBlob = await fetchModel()

  // set the model
  console.log("Setting the model to", MODEL_KEY)
  await redis.call('AI.MODELSET', MODEL_KEY, 'TF', 'CPU',
    'INPUTS', MODEL_INPUT_NODES_NAME,
    'OUTPUTS', MODEL_OUTPUT_NODES_NAME,
    'BLOB', modelBlob)

  // fetch the image data
  let imageData = await fetchImageData(imagePaths)

  // place normalized image in input tensor
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
  let outputBuffer = await redis.callBuffer('AI.TENSORGET', OUTPUT_TENSOR_KEY, 'BLOB')
  let encodedOutput = tensorToArrayOfFloats(outputBuffer, outputShape)

  // decode the classifications
  console.log("Decoding results")
  let decodedTopOutput = encodedOutput.map((row, rowIndex) => {
    return row
      .map((score, index) => {
        return { label: labels[index], score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_COUNT)
      .map(result => { 
        return { path: imagePaths[rowIndex], label: result.label, score: result.score }
      })
  })

  decodedTopOutput.forEach(row => console.table(row))

  redis.quit()
}

function fetchImagePaths() {
  let [, , ...paths] = Array.from(process.argv)
  return paths
}

async function fetchLabels() {
  return JSON.parse(await fs.readFile(LABELS_PATH))
}

async function fetchModel() {
  return await fs.readFile(MODEL_PATH)
}

async function fetchImageData(paths) {

  let imageBuffers = await Promise.all(
    await paths.map(async path => {

      // load and resize image
      console.log("Reading and resizing", path)
      let image = await Jimp.read(path)
      let resizedImage = image.cover(IMAGE_WIDTH, IMAGE_HEIGHT)
      let imageBytes = Array.from(resizedImage.bitmap.data)

      // normalize image data
      console.log("Normalizing image data")
      let imageColorBytes = removeAlpha(imageBytes)
      let normalizedImageFloats = normalizeRgb(imageColorBytes)
      let imageBuffer = Buffer.from(normalizedImageFloats.buffer)

      // return the buffer
      return imageBuffer
    })
  )

  return Buffer.concat(imageBuffers)
}

function removeAlpha(data) {
  // Image data includes RGB and the alpha channel, giving 4 bytes
  // per pixel. We only care about the RGB so drop every fourth byte.
  return data.filter((byte, index) => (index + 1) % 4 !== 0)
}

function normalizeRgb(data) {
  // scale the rgb from 0 through 255 to -1.0 throuh +1.0
  return Float32Array.from(data.map(byte => byte / 127.5 - 1))
}

function tensorToArrayOfFloats(buffer, shape) {
  // Each float is 4-bytes so make a new array, fill it with nothing,
  // and map the nothing to the results of reading the buffer.
  return new Array(shape[0]).fill().map((_, index0) => {
    return new Array(shape[1]).fill().map((_, index1) => {
      return buffer.readFloatLE( shape[1] * index0 * 4 + index1 * 4)
    })
  })
}

main()
