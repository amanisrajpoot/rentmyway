import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, formType } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const normalizedText = text.toLowerCase();
    let data: any = {};

    // Helper: Parse currency/numbers (handles 40k, 50 thousand, 1 lakh)
    const parseAmount = (input: string, keyword: string): number | null => {
      const regex = new RegExp(`${keyword}[^0-9]*(\\d+(?:\\.\\d+)?)\\s*(k|thousand|lakh|lac|l)?`, 'i');
      const match = input.match(regex) || input.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(k|thousand|lakh|lac|l)?[^0-9]*${keyword}`, 'i'));
      
      if (match) {
        let val = parseFloat(match[1]);
        const unit = match[2]?.toLowerCase();
        if (unit === 'k' || unit === 'thousand') val *= 1000;
        if (unit === 'lakh' || unit === 'lac' || unit === 'l') val *= 100000;
        return val;
      }
      return null;
    };

    if (formType === 'property') {
      data = {
        title: text.length > 30 ? text.substring(0, 30) + '...' : text,
        property_type: normalizedText.includes('1bhk') || normalizedText.includes('1 bhk') ? '1bhk' :
                       normalizedText.includes('2bhk') || normalizedText.includes('2 bhk') ? '2bhk' :
                       normalizedText.includes('3bhk') || normalizedText.includes('3 bhk') ? '3bhk' :
                       normalizedText.includes('4bhk') || normalizedText.includes('4 bhk') ? '4bhk' :
                       normalizedText.includes('studio') ? 'studio' :
                       normalizedText.includes('villa') ? 'villa' :
                       normalizedText.includes('independent') ? 'independent_house' :
                       normalizedText.includes('pg') ? 'pg' : '2bhk',
        furnishing: normalizedText.includes('fully') || normalizedText.includes('full furnishing') ? 'fully_furnished' :
                    normalizedText.includes('semi') ? 'semi_furnished' :
                    normalizedText.includes('unfurnished') || normalizedText.includes('empty') ? 'unfurnished' : 'semi_furnished',
        rent: parseAmount(normalizedText, 'rent'),
        deposit: parseAmount(normalizedText, 'deposit'),
        parking: normalizedText.includes('parking') && !normalizedText.includes('no parking'),
        pet_friendly: normalizedText.includes('pet') && !normalizedText.includes('no pet'),
      };

      // Extract locality (simple heuristic: words after "in" or "at")
      const localityMatch = normalizedText.match(/(?:in|at|near)\s+([a-z\s]{3,20})(?:\s+for|\s+with|\s+is|\.|$)/i);
      if (localityMatch) data.locality = localityMatch[1].trim();
    } 

    else if (formType === 'lead') {
      const phoneMatch = normalizedText.match(/\b\d{10}\b/);
      const emailMatch = normalizedText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
      
      data = {
        name: normalizedText.match(/(?:name is|call|for|this is)\s+([a-z\s]{2,20})(?:\s+with|\s+who|\s+phone|\s+is|\.|$)/i)?.[1]?.trim() || null,
        phone: phoneMatch ? phoneMatch[0] : null,
        email: emailMatch ? emailMatch[0] : null,
        budget_min: parseAmount(normalizedText, 'budget') || parseAmount(normalizedText, 'under'),
        budget_max: parseAmount(normalizedText, 'max') || parseAmount(normalizedText, 'upto'),
        preferred_type: normalizedText.includes('1bhk') || normalizedText.includes('1 bhk') ? '1bhk' :
                       normalizedText.includes('2bhk') || normalizedText.includes('2 bhk') ? '2bhk' :
                       normalizedText.includes('3bhk') || normalizedText.includes('3 bhk') ? '3bhk' :
                       normalizedText.includes('4bhk') || normalizedText.includes('4 bhk') ? '4bhk' :
                       normalizedText.includes('studio') ? 'studio' :
                       normalizedText.includes('villa') ? 'villa' :
                       normalizedText.includes('independent') ? 'independent_house' :
                       normalizedText.includes('pg') ? 'pg' : null,
        notes: text,
      };
    } 

    else if (formType === 'complaint') {
      data = {
        title: text.split(/[.!?]/)[0].substring(0, 50),
        description: text,
        priority: normalizedText.includes('urgent') || normalizedText.includes('emergency') ? 'urgent' :
                  normalizedText.includes('high') || normalizedText.includes('immediately') ? 'high' :
                  normalizedText.includes('low') ? 'low' : 'medium',
      };
    }

    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error('Voice parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse voice data locally' }, 
      { status: 500 }
    );
  }
}
