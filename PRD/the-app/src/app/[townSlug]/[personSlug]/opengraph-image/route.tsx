import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { generateImageUrlServer } from '@/lib/image-url-server';

interface Props {
  params: Promise<{
    townSlug: string;
    personSlug: string;
  }>;
}

async function getPersonOGData(townSlug: string, personSlug: string) {
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
        orderBy: [{ imageType: 'asc' }, { sequenceNumber: 'asc' }],
        take: 1,
        include: {
          image: true,
        },
      },
      theme: true,
    },
  });

  return person;
}

export async function GET(_request: Request, { params }: Props) {
  const { townSlug, personSlug } = await params;
  const person = await getPersonOGData(townSlug, personSlug);

  if (!person) {
    notFound();
  }

  const personName = `${person.firstName} ${person.lastName}`;
  const hometown = person.town.name;
  const primaryImage = person.personImages[0];
  const imageUrl = primaryImage?.image.s3Key ? await generateImageUrlServer(primaryImage.image.s3Key) : null;

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
              fontSize: '24px',
              color: '#6B7280',
              margin: '0 0 20px 0',
              textAlign: 'center',
            }}
          >
            As seen on bring-me-home.com
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
              <div
                style={{
                  fontSize: '120px',
                  color: '#9CA3AF',
                  fontWeight: 'bold',
                }}
              >
                {person.firstName[0]}{person.lastName[0]}
              </div>
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
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}