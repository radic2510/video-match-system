"""Mock models for testing without real ONNX files."""

import numpy as np
import onnx
from onnx import helper, TensorProto


def create_mock_yolo_model(output_path: str) -> None:
    """Create a minimal ONNX model that simulates YOLOv8 output.

    Input: images [batch, 3, 640, 640]
    Output: predictions [batch, 84, 8400]

    The model just returns random values for testing.
    """
    # Define input
    input_tensor = helper.make_tensor_value_info("images", TensorProto.FLOAT, [1, 3, 640, 640])

    # Define output (YOLOv8 format: 84 values = 4 bbox + 80 classes)
    output_tensor = helper.make_tensor_value_info("output0", TensorProto.FLOAT, [1, 84, 8400])

    # Create a simple identity-like node (just for structure)
    node = helper.make_node(
        "Identity",
        inputs=["images"],
        outputs=["output0"],
    )

    # Create graph
    graph = helper.make_graph(
        [node],
        "mock_yolo",
        [input_tensor],
        [output_tensor],
    )

    # Create model
    model = helper.make_model(graph, producer_name="test")
    model.opset_import[0].version = 13

    # Save
    onnx.save(model, output_path)


def create_mock_clip_model(output_path: str) -> None:
    """Create a minimal ONNX model that simulates CLIP encoder output.

    Input: image [batch, 3, 224, 224]
    Output: embedding [batch, 768]
    """
    input_tensor = helper.make_tensor_value_info("image", TensorProto.FLOAT, [1, 3, 224, 224])
    output_tensor = helper.make_tensor_value_info("embedding", TensorProto.FLOAT, [1, 768])

    node = helper.make_node("Identity", inputs=["image"], outputs=["embedding"])

    graph = helper.make_graph([node], "mock_clip", [input_tensor], [output_tensor])
    model = helper.make_model(graph, producer_name="test")
    model.opset_import[0].version = 13

    onnx.save(model, output_path)


def create_mock_dino_model(output_path: str) -> None:
    """Create a minimal ONNX model that simulates DINOv2 encoder output."""
    input_tensor = helper.make_tensor_value_info("image", TensorProto.FLOAT, [1, 3, 224, 224])
    output_tensor = helper.make_tensor_value_info("embedding", TensorProto.FLOAT, [1, 768])

    node = helper.make_node("Identity", inputs=["image"], outputs=["embedding"])

    graph = helper.make_graph([node], "mock_dino", [input_tensor], [output_tensor])
    model = helper.make_model(graph, producer_name="test")
    model.opset_import[0].version = 13

    onnx.save(model, output_path)


def create_test_image(height: int = 640, width: int = 640) -> np.ndarray:
    """Create a test image with random pixel values.

    Returns:
        np.ndarray: RGB image [H, W, 3] with values in [0, 255]
    """
    return np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)


def create_test_image_with_display(height: int = 640, width: int = 640) -> np.ndarray:
    """Create a test image with a white rectangular region simulating a display.

    Returns:
        np.ndarray: RGB image with a bright rectangle in the center
    """
    image = create_test_image(height, width)

    # Add a bright rectangle in the center (simulating display)
    h_start, h_end = height // 4, 3 * height // 4
    w_start, w_end = width // 4, 3 * width // 4
    image[h_start:h_end, w_start:w_end] = 240  # Almost white

    return image
