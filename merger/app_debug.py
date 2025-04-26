# Import necessary libraries
import tensorflow as tf
from tensorflow import keras
from flwr.server.strategy import FedAvg  # Federated strategy
from flwr_serverless import AsyncFederatedNode
from flwr_serverless.keras import FlwrFederatedCallback

from lib.shared_folder_http import SharedFolderHTTPAuth

# Define the federated learning strategy and shared folder
strategy = FedAvg()
shared_folder = SharedFolderHTTPAuth(
    base_url="http://localhost:4000/r"
)
node = AsyncFederatedNode(strategy=strategy, shared_folder=shared_folder)

# Define dataset and model parameters
batch_size = 32
dataset = tf.data.Dataset.from_tensor_slices((tf.random.normal([1000, 28, 28]), tf.random.uniform([1000], maxval=10, dtype=tf.int32)))
dataset = dataset.batch(batch_size)

steps_per_epoch = len(dataset)  # Calculate steps per epoch based on dataset size and batch size
num_examples_per_epoch = steps_per_epoch * batch_size  # Number of examples used in each epoch

# Define the federated callback
callback = FlwrFederatedCallback(
    node,
    num_examples_per_epoch=num_examples_per_epoch,  
    save_model_before_aggregation=False,                    # skip per client snapshots
    override_metrics_with_aggregated_metrics=False,         # keep both local and global metrics
    save_model_after_aggregation=True,                      # persist global model each round
)

# Define and compile the model
model = keras.Sequential([
    keras.layers.Flatten(input_shape=(28, 28)),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(10, activation='softmax')
])
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

# Train the model using the federated callback
model.fit(dataset, epochs=5, callbacks=[callback])