import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import Link from 'next/link';
import { updatePerson } from '@/app/actions/persons';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'persons', 'update')) {
    redirect('/admin');
  }

  const person = await prisma.person.findUnique({
    where: { id },
    include: { town: true },
  });

  if (!person) {
    redirect('/admin/persons');
  }

  const towns = await prisma.town.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  async function updatePersonWithRedirect(formData: FormData) {
    'use server';
    const result = await updatePerson(id, formData);
    if (result.success) {
      redirect('/admin/persons');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Person</h1>
        <Link
          href="/admin/persons"
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={updatePersonWithRedirect} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                defaultValue={person.firstName}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                defaultValue={person.lastName}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="middleName"
                className="block text-sm font-medium text-gray-700"
              >
                Middle Name
              </label>
              <input
                type="text"
                id="middleName"
                name="middleName"
                defaultValue={person.middleName || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="townId"
                className="block text-sm font-medium text-gray-700"
              >
                Town
              </label>
              <select
                id="townId"
                name="townId"
                required
                defaultValue={person.townId}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {towns.map(town => (
                  <option key={town.id} value={town.id}>
                    {town.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700"
              >
                Date of Birth
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                defaultValue={
                  person.dateOfBirth
                    ? new Date(person.dateOfBirth).toISOString().split('T')[0]
                    : ''
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="lastKnownAddress"
                className="block text-sm font-medium text-gray-700"
              >
                Last Known Address
              </label>
              <input
                type="text"
                id="lastKnownAddress"
                name="lastKnownAddress"
                required
                defaultValue={person.lastKnownAddress}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="story"
              className="block text-sm font-medium text-gray-700"
            >
              Story
            </label>
            <textarea
              id="story"
              name="story"
              rows={6}
              defaultValue={person.story || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="primaryPicture"
              className="block text-sm font-medium text-gray-700"
            >
              Primary Picture
            </label>
            {person.primaryPicture && (
              <div className="mt-2 mb-4">
                <Image
                  src={person.primaryPicture}
                  alt={`${person.firstName} ${person.lastName}`}
                  width={200}
                  height={200}
                  className="rounded-lg object-cover"
                />
                <p className="text-sm text-gray-500 mt-1">Current image</p>
              </div>
            )}
            <input
              type="file"
              id="primaryPicture"
              name="primaryPicture"
              accept="image/*"
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
            <p className="mt-1 text-sm text-gray-500">
              Upload a new image to replace the current one
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              defaultChecked={person.isActive}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isActive"
              className="ml-2 block text-sm text-gray-900"
            >
              Active (visible to public)
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              href="/admin/persons"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Update Person
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
