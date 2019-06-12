REDIS_CLI=../../deps/redis/src/redis-cli

MODEL_FILE=tiny-yolo-voc.pb
INPUT_VAR=input
OUTPUT_VAR=output

MODEL_KEY=yolo
INPUT_KEY=image
OUTPUT_KEY=output

IMAGE_FILE=../img/sample_dog_224.raw
IMAGE_WIDTH=224
IMAGE_HEIGHT=224

echo "SET MODEL"
$REDIS_CLI -x AI.MODELSET $MODEL_KEY TF GPU INPUTS $INPUT_VAR OUTPUTS $OUTPUT_VAR < $MODEL_FILE

# TODO: cast tensor, change shape of tensor (NHWC, NCHW)
#       instead of casting, we could specify the type of data provided in the blob
#       after the BLOB keyword
# Preprocess: resizes the $INPUT_KEY to cfg size, scales 0-255 to 0-1, and throws away alpha channel
# Not clear why AI doesn't complain when we feed a random $INPUT_KEY
echo "SET TENSOR"
$REDIS_CLI -x AI.TENSORSET $INPUT_KEY FLOAT 1 $IMAGE_WIDTH $IMAGE_HEIGHT 3 BLOB < $IMAGE_FILE

echo "GET TENSOR"
$REDIS_CLI AI.TENSORGET $INPUT_KEY META

echo "RUN MODEL"
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY
$REDIS_CLI AI.MODELRUN $MODEL_KEY INPUTS $INPUT_KEY OUTPUTS $OUTPUT_KEY

echo "GET OUTPUT TENSOR"
$REDIS_CLI AI.TENSORGET $OUTPUT_KEY META

$REDIS_CLI DEL ${MODEL_KEY} ${INPUT_KEY} ${OUTPUT_KEY}
