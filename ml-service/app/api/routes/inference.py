"""ML inference endpoints."""

import time
from io import BytesIO

import cv2
import numpy as np
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter()


# Response models
class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class Detection(BaseModel):
    bbox: BoundingBox
    confidence: float = Field(..., ge=0, le=1)
    class_: str = Field(..., alias="class")


class DisplayDetectionResponse(BaseModel):
    detections: List[Detection]
    inferenceTimeMs: int


class EmbeddingResponse(BaseModel):
    embedding: List[float]
    model: str
    inferenceTimeMs: int


class VerificationScores(BaseModel):
    embedding: float
    sift: Optional[float] = None
    color: Optional[float] = None
    text: Optional[float] = None


class BestMatch(BaseModel):
    videoId: str
    frameNumber: int
    confidence: float = Field(..., ge=0, le=1)
    scores: VerificationScores


class AlternativeCandidate(BaseModel):
    videoId: str
    frameNumber: int
    confidence: float


class ProcessingStages(BaseModel):
    displayDetection: int
    perspectiveCorrection: int
    qualityAssessment: int
    qualityEnhancement: Optional[int] = None
    embeddingExtraction: int
    vectorSearch: int
    verification: int


class MatchResponse(BaseModel):
    matched: bool
    bestMatch: Optional[BestMatch] = None
    alternativeCandidates: List[AlternativeCandidate] = []
    processingStages: ProcessingStages
    totalInferenceTimeMs: int


@router.post("/inference/detect-display", response_model=DisplayDetectionResponse)
async def detect_display(image: UploadFile = File(...)):
    """Detect display in image.

    This endpoint uses YOLOv8 to detect displays in the uploaded image.
    """
    try:
        # Read image
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        # Mock detection for testing
        start = time.perf_counter()
        # In production: detections = yolo_model.detect_display(img)
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        # Mock response
        return DisplayDetectionResponse(
            detections=[
                Detection(
                    bbox=BoundingBox(x=100, y=100, width=400, height=300),
                    confidence=0.92,
                    class_="display",
                )
            ],
            inferenceTimeMs=elapsed_ms or 45,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inference/extract-embedding", response_model=EmbeddingResponse)
async def extract_embedding(
    image: UploadFile = File(...),
    model: str = Form("ensemble"),
):
    """Extract embedding from image.

    Supports: ensemble (CLIP+DINOv2), clip, dino
    """
    try:
        # Read image
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        # Mock embedding extraction
        start = time.perf_counter()
        # In production: embedding = ensemble.extract_embedding(img)
        mock_embedding = np.random.randn(768).astype(np.float32)
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        return EmbeddingResponse(
            embedding=mock_embedding.tolist(),
            model=model,
            inferenceTimeMs=elapsed_ms or 20,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inference/match-advertisement", response_model=MatchResponse)
async def match_advertisement(
    image: UploadFile = File(...),
    topK: int = Form(30),
):
    """Match viewer photo to advertisements.

    Complete pipeline: detection → preprocessing → embedding → search → verification
    """
    try:
        # Read image
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        # Mock full pipeline
        processing_stages = ProcessingStages(
            displayDetection=45,
            perspectiveCorrection=30,
            qualityAssessment=10,
            qualityEnhancement=None,
            embeddingExtraction=35,
            vectorSearch=50,
            verification=100,
        )

        total_time = (
            processing_stages.displayDetection
            + processing_stages.perspectiveCorrection
            + processing_stages.qualityAssessment
            + processing_stages.embeddingExtraction
            + processing_stages.vectorSearch
            + processing_stages.verification
        )

        # Mock successful match
        best_match = BestMatch(
            videoId="660e8400-e29b-41d4-a716-446655440001",
            frameNumber=234,
            confidence=0.94,
            scores=VerificationScores(
                embedding=0.92,
                sift=0.95,
                color=0.88,
                text=0.91,
            ),
        )

        alternatives = [
            AlternativeCandidate(
                videoId="660e8400-e29b-41d4-a716-446655440002",
                frameNumber=120,
                confidence=0.78,
            )
        ]

        return MatchResponse(
            matched=True,
            bestMatch=best_match,
            alternativeCandidates=alternatives,
            processingStages=processing_stages,
            totalInferenceTimeMs=total_time,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
