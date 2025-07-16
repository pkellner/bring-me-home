import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { generateImageUrlServerWithCdn } from '@/lib/image-url-server';

interface Props {
  params: Promise<{
    townSlug: string;
    personSlug: string;
  }>;
}

async function getPersonOGData(townSlug: string, personSlug: string) {
  console.log(`Fetching OG data for: ${townSlug}/${personSlug}`);
  
  const person = await prisma.person.findFirst({
    where: {
      slug: personSlug,
      isActive: true,
      town: {
        slug: townSlug,
        isActive: true,
      },
    },
    include: {
      town: true,
      personImages: {
        where: {
          imageType: 'primary',
        },
        include: {
          image: true,
        },
      },
      theme: true,
    },
  });

  if (person) {
    console.log(`Found person: ${person.firstName} ${person.lastName}, images: ${person.personImages.length}`);
  }

  return person;
}

export async function GET(_request: Request, { params }: Props) {
  try {
    const { townSlug, personSlug } = await params;
    const person = await getPersonOGData(townSlug, personSlug);

    if (!person) {
      console.error(`Person not found for OG image: ${townSlug}/${personSlug}`);
      notFound();
    }

    const personName = `${person.firstName} ${person.lastName}`;
    const hometown = person.town.name;
    const primaryImage = person.personImages[0];
    
    let imageUrl = null;
    if (primaryImage?.image?.id) {
      try {
        // generateImageUrlServerWithCdn expects an image ID and pathname
        const relativeUrl = await generateImageUrlServerWithCdn(primaryImage.image.id, undefined, `/${townSlug}/${personSlug}`);
        
        // Convert to absolute URL for OG image generation
        if (relativeUrl) {
          // Use PRODUCTION_URL in production, otherwise use NEXT_PUBLIC_APP_URL
          const baseUrl = process.env.NODE_ENV === 'production'
            ? (process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bring-me-home.com')
            : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
          
          // Ensure the URL is absolute
          if (relativeUrl.startsWith('http')) {
            imageUrl = relativeUrl;
          } else {
            imageUrl = `${baseUrl}${relativeUrl}`;
          }
          
          console.log(`Generated image URL: ${imageUrl}`);
        }
      } catch (error) {
        console.error('Error generating image URL for OG image:', error);
        // Continue without image rather than failing entirely
      }
    }

    const themeColors = person.theme ? JSON.parse(person.theme.colors) : null;
    const primaryColor = themeColors?.primary || '#4338CA';
    const secondaryColor = themeColors?.secondary || '#6366F1';

    return new ImageResponse(
      (
        <div
          style={{
            background: `linear-gradient(to bottom right, ${primaryColor}, ${secondaryColor})`,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxWidth: '90%',
            }}
          >
            <p
              style={{
                fontSize: '28px',
                color: '#6B7280',
                margin: '0 0 20px 0',
                textAlign: 'center',
                fontWeight: '600',
              }}
            >
              ICE Detention Information
            </p>

            {imageUrl && (
              <div
                style={{
                  width: '300px',
                  height: '300px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `6px solid ${primaryColor}`,
                  marginBottom: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F3F4F6',
                }}
              >
                <img
                  src={imageUrl}
                  alt={personName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            {!imageUrl && (
              <div
                style={{
                  width: '300px',
                  height: '300px',
                  borderRadius: '50%',
                  backgroundColor: '#E5E7EB',
                  marginBottom: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `6px solid ${primaryColor}`,
                }}
              >
                <span
                  style={{
                    fontSize: '120px',
                    color: '#9CA3AF',
                    fontWeight: 'bold',
                  }}
                >
                  {person.firstName[0]}{person.lastName[0]}
                </span>
              </div>
            )}

            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#111827',
                margin: '0',
                textAlign: 'center',
              }}
            >
              {personName}
            </h1>
            <p
              style={{
                fontSize: '32px',
                color: '#6B7280',
                margin: '10px 0 0 0',
                textAlign: 'center',
              }}
            >
              {hometown}
            </p>
            <p
              style={{
                fontSize: '18px',
                color: '#9CA3AF',
                margin: '15px 0 0 0',
                textAlign: 'center',
              }}
            >
              from: https://bring-me-home.com
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    // Return a basic fallback image on error
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(to bottom right, #4338CA, #6366F1)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#111827',
                margin: '0',
                textAlign: 'center',
              }}
            >
              Bring Me Home
            </h1>
            <p
              style={{
                fontSize: '24px',
                color: '#6B7280',
                margin: '10px 0 0 0',
                textAlign: 'center',
              }}
            >
              Support for ICE detainees
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}