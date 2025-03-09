import { NextResponse } from 'next/server';
import Together from 'together-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Model selection constant - change this to switch between models
const VISION_MODEL = 'TOGETHER'; // Options: 'TOGETHER' or 'GEMINI'

// Define the request type for TypeScript
type AnalyzeImageRequest = {
  image: string;
  model?: 'TOGETHER' | 'GEMINI'; // Optional model override in request
};

// Define the response structure
type StructuredResponse = {
  item: string;
  category: 'recycle' | 'compost' | 'trash';
  explanation: string;
  color: string;
}

export async function GET(request: Request) {
  return NextResponse.redirect('https://www.chinesepowered.com');
}

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

    // Determine which model to use (from request or default)
    const modelToUse = body.model || VISION_MODEL;
    
    // Get the base64 image from the request
    const base64Image = body.image;
    
    // Create the prompt for waste identification
    const analyzePrompt = `Look at this image and identify what item the user is trying to dispose of.
                If there are people or other objects in the image, only foucs on the most likely item that the user is trying to dispose of.
                Respond in this exact format:
                [ITEM: name of the waste item]
                [CATEGORY: recycle, compost, or trash]
                [EXPLANATION: detailed explanation why the item goes in this category]`;
    
    let aiResponse = '';
    
    // Process with either Together AI or Gemini based on selection
    if (modelToUse === 'TOGETHER') {
      aiResponse = await processWithTogetherAI(analyzePrompt, base64Image);
    } else {
      aiResponse = await processWithGemini(analyzePrompt, base64Image);
    }
    
    // Parse the structured response
    const structured = parseAIResponse(aiResponse);
    
    // Determine color based on category
    let color = 'bg-slate-600'; // Default for trash
    if (structured.category === 'recycle') {
      color = 'bg-emerald-500';
    } else if (structured.category === 'compost') {
      color = 'bg-amber-700';
    }
    
    return NextResponse.json({
      item: structured.item,
      category: structured.category,
      explanation: structured.explanation,
      color,
      model: modelToUse // Include which model was used in the response
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Process the image using Together AI's vision model
 */
async function processWithTogetherAI(prompt: string, base64Image: string): Promise<string> {
  // Initialize the Together AI client
  const together = new Together({
    apiKey: process.env.TOGETHER_API_KEY,
  });
  
  // Make sure the image is in the correct format (base64 with data URI prefix)
  const imageUrl = base64Image.startsWith('data:') 
    ? base64Image 
    : `data:image/jpeg;base64,${base64Image}`;

  // Call Together AI's chat completions API
  const response = await together.chat.completions.create({
    model: "meta-llama/Llama-Vision-Free",
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: prompt 
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      }
    ],
    temperature: 0.2,
    max_tokens: 1000,
    stream: false,  // Non-streaming response
  });

  // Extract the AI response text
  return response.choices[0].message.content || '';
}

/**
 * Process the image using Google's Gemini 2.0 Flash model
 */
async function processWithGemini(prompt: string, base64Image: string): Promise<string> {
  // Initialize the Gemini API client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  // Make sure the image is in the correct format for Gemini
  // Remove data URI prefix if present
  let imageData = base64Image;
  if (base64Image.includes(',')) {
    imageData = base64Image.split(',')[1];
  } else if (base64Image.startsWith('data:')) {
    // Handle other formats of data URIs
    const match = base64Image.match(/^data:[^;]+;base64,(.+)$/);
    if (match) {
      imageData = match[1];
    }
  }
  
  // Create image part for Gemini
  const imagePart = {
    inlineData: {
      data: imageData,
      mimeType: 'image/jpeg', // Assuming JPEG; adjust if needed
    },
  };
  
  // Call Gemini API
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          imagePart,
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1000,
    },
  });
  
  // Extract the response text
  const responseText = result.response.text();
  return responseText;
}

/**
 * Parses the AI response to extract structured information
 * Uses regex patterns to identify item, category, and explanation
 */
function parseAIResponse(response: string): StructuredResponse {
  // Default values
  let structured: StructuredResponse = {
    item: 'Unidentified item',
    category: 'trash',
    explanation: 'Unable to determine proper disposal method.',
    color: 'bg-slate-600'
  };

  // Extract item using regex
  const itemMatch = response.match(/\[ITEM:?\s*(.*?)\]/i);
  if (itemMatch && itemMatch[1]) {
    structured.item = itemMatch[1].trim();
  }

  // Extract category using regex
  const categoryMatch = response.match(/\[CATEGORY:?\s*(recycle|compost|trash)\]/i);
  if (categoryMatch && categoryMatch[1]) {
    const category = categoryMatch[1].toLowerCase();
    structured.category = category as 'recycle' | 'compost' | 'trash';
  }

  // Extract explanation using regex
  const explanationMatch = response.match(/\[EXPLANATION:?\s*(.*?)\](?:\s|$)/is);
  if (explanationMatch && explanationMatch[1]) {
    structured.explanation = explanationMatch[1].trim();
  } else {
    // Fallback: if structured format isn't followed, use the whole response as explanation
    // but still try to determine category from keywords
    structured.explanation = response.trim();
    
    if (response.toLowerCase().includes('recycle')) {
      structured.category = 'recycle';
    } else if (response.toLowerCase().includes('compost')) {
      structured.category = 'compost';
    }
  }

  return structured;
}