'use client';

import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import Image from 'next/image';

type AnalysisResult = {
  category: 'recycle' | 'compost' | 'trash';
  color: string;
  explanation: string;
};

export default function Home() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isUsingCamera, setIsUsingCamera] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activateCamera = () => {
    setIsUsingCamera(true);
    setCapturedImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  const deactivateCamera = () => {
    setIsUsingCamera(false);
  };

  const captureImage = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
      setIsUsingCamera(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setAnalysisResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const imageData = capturedImage.split(',')[1]; // Remove the data URL prefix
      
      // This is where you would call your actual API endpoint
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }
      

      setAnalysisResult(data);
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError('Failed to analyze the image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetApp = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  // Get category icon based on the result
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'recycle':
        return '♻️';
      case 'compost':
        return '🌱';
      case 'trash':
        return '🗑️';
      default:
        return '❓';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="bg-blue-600 text-white p-4 text-center">
          <h1 className="text-2xl font-bold">Recycling Assistant</h1>
          <p className="mt-1 text-sm">Take a photo of an item to learn how to dispose of it properly</p>
        </header>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
              {error}
            </div>
          )}

          {isUsingCamera ? (
            <div className="relative">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full rounded-md"
              />
              <div className="mt-4 flex justify-center">
                <button
                  onClick={captureImage}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 transition"
                >
                  Take Photo
                </button>
                <button
                  onClick={deactivateCamera}
                  className="ml-2 px-4 py-2.5 bg-gray-300 text-gray-700 rounded-full shadow hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="space-y-4">
              <div className="relative">
                {/* Using Next.js Image component here */}
                <div className="relative w-full h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedImage}
                    alt="Captured item"
                    className="w-full h-full object-contain rounded-md"
                  />
                </div>
                {analysisResult && (
                  <div className={`absolute top-2 right-2 ${analysisResult.color} text-white text-2xl font-bold rounded-full w-10 h-10 flex items-center justify-center`}>
                    {getCategoryIcon(analysisResult.category)}
                  </div>
                )}
              </div>

              {analysisResult ? (
                <div className={`p-4 bg-opacity-10 border rounded-md ${analysisResult.color.replace('bg-', 'bg-opacity-10 border-')}`}>
                  <h2 className="text-xl font-bold capitalize flex items-center">
                    {getCategoryIcon(analysisResult.category)} {analysisResult.category}
                  </h2>
                  <p className="mt-2 text-gray-700">{analysisResult.explanation}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={analyzeImage}
                    className="w-full py-3 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition flex items-center justify-center"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : 'Analyze Item'}
                  </button>
                  <button
                    onClick={resetApp}
                    className="w-full py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                  >
                    Take Another Photo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-md">
                <p className="text-gray-500 mb-4">Take a photo or upload an image of the item</p>
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
                  <button
                    onClick={activateCamera}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition flex items-center justify-center"
                  >
                    📸 Camera
                  </button>
                  <button
                    onClick={triggerFileInput}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition flex items-center justify-center"
                  >
                    🖼️ Upload
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {analysisResult && (
            <button
              onClick={resetApp}
              className="mt-4 w-full py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
            >
              Scan Another Item
            </button>
          )}
        </div>

        <footer className="bg-gray-100 p-4 text-center text-gray-500 text-sm">
          <p>Recycle Buddy</p>
        </footer>
      </main>
    </div>
  );
}