import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch all AV components from Strapi backend
    const response = await fetch('https://backend.sandyy.dev/api/av-components?pagination[pageSize]=1000', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch components: ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data.data || [],
      meta: data.meta || {}
    });
  } catch (error) {
    console.error('Error fetching AV components:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch components',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 