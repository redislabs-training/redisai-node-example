let fs = require('fs').promises

let Redis = require('ioredis')
let Jimp = require('jimp')

const MODEL_PATH = '../models/mobilenet_v2_1.4_224_frozen.pb'
const MODEL_INPUT_NODES_NAME = 'input'
const MODEL_OUTPUT_NODES_NAME = 'MobilenetV2/Predictions/Reshape_1'

const LABELS_PATH = 'labels.json'

const MODEL_REDIS_KEY = 'mobilenet'

const IMAGE_HEIGHT = 224
const IMAGE_WIDTH = 224

const TOP_COUNT = 3

async function main() {

  // extract filenames from command line
  let [, , ...filenames] = Array.from(process.argv)

  // read the labels from the json
  let labels = JSON.parse(await fs.readFile(LABELS_PATH))

  // open redis
  let redis = new Redis()

  // read and set the model
  let modelBlob = await fs.readFile(MODEL_PATH)

  console.log("Setting the model to", MODEL_REDIS_KEY)
  await redis.call('AI.MODELSET', MODEL_REDIS_KEY, 'TF', 'CPU',
    'INPUTS', MODEL_INPUT_NODES_NAME,
    'OUTPUTS', MODEL_OUTPUT_NODES_NAME,
    'BLOB', modelBlob)

  // classify all the files
  let classifications = await Promise.all(
    
    filenames.map(async (filename, index) => {

      // load and resize image
      console.log("Reading and resizing", filename)
      let image = await Jimp.read(filename)
      let resizedImage = image.cover(IMAGE_WIDTH, IMAGE_HEIGHT)
      let imageBytes = Array.from(resizedImage.bitmap.data)

      // normalize image data
      console.log("Normalizing image data")
      let imageColorBytes = removeAlpha(imageBytes)
      let normalizedImageFloats = normalizeRgb(imageColorBytes)
      let imageBuffer = Buffer.from(normalizedImageFloats.buffer)

      // keys for the input and output tensors
      let inputKey = 'input_' + index
      let outputKey = 'output_' + index

      // place normalized image in input tensor
      let shape = [1, IMAGE_WIDTH, IMAGE_HEIGHT, 3]
      console.log("Setting input tensor of shape", shape)
      await redis.call('AI.TENSORSET', inputKey,
                      'FLOAT', ...shape,
                      'BLOB', imageBuffer)

      // infer
      console.log("Running model")
      await redis.call('AI.MODELRUN', 'mobilenet', 'INPUTS', inputKey, 'OUTPUTS', outputKey)

      // read the output tensor
      console.log("Reading output tensor")
      let outputBuffer = await redis.callBuffer('AI.TENSORGET', outputKey, 'BLOB')
      let encodedOutput = bufferToFloatArray(outputBuffer)

      // decode the classifications
      console.log("Decoding results")
      let decodedOutput = encodedOutput.map((score, index) => {
        return { label: labels[index], score }
      })

      // report the top result
      return decodedOutput
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_COUNT)
        .map(result => { return { filename, label: result.label, score: result.score } })
    })
  )

  console.table(classifications.flat(1))

  redis.quit()
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

function bufferToFloatArray(buffer) {
  // Each float is 4-bytes so make a new array, fill it with nothing,
  // and map the nothing to the results of reading the buffer.
  return new Array(buffer.length / 4)
    .fill()
    .map((_, index) => buffer.readFloatLE(4 * index))
}

main()
