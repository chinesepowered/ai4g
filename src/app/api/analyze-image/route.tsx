// File: src/app/api/analyze-image/route.ts
import { NextResponse } from 'next/server';

// Define the request type for TypeScript
type AnalyzeImageRequest = {
  image: string;
};

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body: AnalyzeImageRequest = await request.json();
    
    if (!body.image) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Call Together AI's API to analyze the image
    // This is where you'd make the actual API call to Together AI
    const togetherResponse = await fetch('https://api.together.xyz/inference', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-vision', // Replace with the actual model name
        prompt: 'What is this item and how should it be disposed of? Options: recycle, compost, or trash.',
        image: body.image,
        max_tokens: 500,
      }),
    });

    if (!togetherResponse.ok) {
      const errorData = await togetherResponse.json();
      console.error('Together API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to analyze image with AI service' },
        { status: 500 }
      );
    }

    const data = await togetherResponse.json();
    const aiResponse = data.output || '';
    
    // Process the response to determine the category and explanation
    // This is a simplified parsing example - you would need to implement more 
    // sophisticated parsing based on the actual API response format
    let category: 'recycle' | 'compost' | 'trash' = 'trash'; // Default
    let color = 'bg-slate-600';
    
    if (aiResponse.toLowerCase().includes('recycle')) {
      category = 'recycle';
      color = 'bg-emerald-500';
    } else if (aiResponse.toLowerCase().includes('compost')) {
      category = 'compost';
      color = 'bg-amber-700';
    }
    
    return NextResponse.json({
      category,
      color,
      explanation: aiResponse,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}