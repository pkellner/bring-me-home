'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/OptimizedLink';
import { createUser, updateUser, revokeUserCommentToken } from '@/app/actions/users';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';

interface Role {
  id: string;
  name: string;
}

interface Town {
  id: string;
  name: string;
  state: string;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  town: {
    name: string;
  };
}

interface User {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  allowAnonymousComments: boolean;
  userRoles: Array<{
    role: { id: string; name: string };
  }>;
  townAccess: Array<{
    townId: string;
    accessLevel: string;
    town: { id: string; name: string };
  }>;
  personAccess: Array<{
    personId: string;
    accessLevel: string;
    person: { id: string; firstName: string; lastName: string };
  }>;
}

interface UserFormProps {
  mode: 'create' | 'edit';
  user?: User;
  roles: Role[];
  towns: Town[];
  persons: Person[];
}

export default function UserForm({
  mode,
  user,
  roles,
  towns,
  persons,
}: UserFormProps) {
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user?.userRoles?.map(ur => ur.role.id) || []
  );
  const [townAccess, setTownAccess] = useState<
    Array<{ townId: string; accessLevel: string }>
  >(
    user?.townAccess?.map(ta => ({
      townId: ta.townId,
      accessLevel: ta.accessLevel,
    })) || []
  );
  const [personAccess, setPersonAccess] = useState<
    Array<{ personId: string; accessLevel: string }>
  >(
    user?.personAccess?.map(pa => ({
      personId: pa.personId,
      accessLevel: pa.accessLevel,
    })) || []
  );

  // Define the return type for the actions
  type ActionState = {
    success?: boolean;
    user?: { id: string; username: string };
    errors?: Record<string, string[]>;
  };

  // Create wrapper functions for useActionState
  const createUserWrapper = async (
    state: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    return await createUser(formData);
  };

  const updateUserWrapper = async (
    state: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    if (!user?.id) {
      return { success: false, errors: { _form: ['User ID is required for update'] } };
    }
    return await updateUser(user.id, formData);
  };

  const [state, formAction] = useActionState(
    mode === 'create' ? createUserWrapper : updateUserWrapper,
    {}
  );

  const handleSubmit = async (formData: FormData) => {
    // Add selected roles to form data
    selectedRoles.forEach(roleId => {
      formData.append('roles', roleId);
    });

    // Add town access to form data
    townAccess.forEach((access, index) => {
      formData.append(`townAccess[${index}][townId]`, access.townId);
      formData.append(`townAccess[${index}][accessLevel]`, access.accessLevel);
    });

    // Add person access to form data
    personAccess.forEach((access, index) => {
      formData.append(`personAccess[${index}][personId]`, access.personId);
      formData.append(
        `personAccess[${index}][accessLevel]`,
        access.accessLevel
      );
    });

    if (mode === 'edit' && user) {
      formData.append('id', user.id);
    }

    formAction(formData);
  };

  const handleRoleChange = (roleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles(prev => [...prev, roleId]);
    } else {
      setSelectedRoles(prev => prev.filter(id => id !== roleId));
    }
  };

  const addTownAccess = () => {
    setTownAccess(prev => [...prev, { townId: '', accessLevel: 'read' }]);
  };

  const removeTownAccess = (index: number) => {
    setTownAccess(prev => prev.filter((_, i) => i !== index));
  };

  const updateTownAccess = (
    index: number,
    field: 'townId' | 'accessLevel',
    value: string
  ) => {
    setTownAccess(prev =>
      prev.map((access, i) =>
        i === index ? { ...access, [field]: value } : access
      )
    );
  };

  const addPersonAccess = () => {
    setPersonAccess(prev => [...prev, { personId: '', accessLevel: 'read' }]);
  };

  const removePersonAccess = (index: number) => {
    setPersonAccess(prev => prev.filter((_, i) => i !== index));
  };

  const updatePersonAccess = (
    index: number,
    field: 'personId' | 'accessLevel',
    value: string
  ) => {
    setPersonAccess(prev =>
      prev.map((access, i) =>
        i === index ? { ...access, [field]: value } : access
      )
    );
  };

  // Handle form submission results
  useEffect(() => {
    if (state.success && state.user) {
      // Show success alert
      const message = mode === 'create' 
        ? `User "${state.user.username}" created successfully!`
        : `User "${state.user.username}" updated successfully!`;
      showSuccessAlert(message, 3000);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin/users');
      }, 500);
    } else if (state.errors) {
      // Show error alert
      const errorMessages: string[] = [];
      Object.entries(state.errors).forEach(([field, messages]) => {
        if (field === '_form') {
          errorMessages.push(...messages);
        } else {
          errorMessages.push(`${field}: ${messages.join(', ')}`);
        }
      });
      
      const message = mode === 'create'
        ? `Failed to create user: ${errorMessages.join('; ')}`
        : `Failed to update user: ${errorMessages.join('; ')}`;
      
      showErrorAlert(message, 5000);
    }
  }, [state, mode, router]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Users
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg">
        <form
          action={handleSubmit}
          className="space-y-8 divide-y divide-gray-200"
        >
          <div className="space-y-8 divide-y divide-gray-200 px-6 py-6">
            {/* Error Message */}
            {state.errors && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      There were errors with your submission
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc list-inside space-y-1">
                        {Object.entries(state.errors).map(([field, messages]) => (
                          messages.map((message, index) => (
                            <li key={`${field}-${index}`}>
                              {field === '_form' ? message : `${field}: ${message}`}
                            </li>
                          ))
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Basic Information
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  User account details and login information.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Username *
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    required
                    defaultValue={user?.username}
                    className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      state.errors?.username ? 'border-red-300' : ''
                    }`}
                  />
                  {state.errors?.username && (
                    <p className="mt-1 text-sm text-red-600">
                      {state.errors.username[0]}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={user?.email || ''}
                    className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      state.errors?.email ? 'border-red-300' : ''
                    }`}
                  />
                  {state.errors?.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {state.errors.email[0]}
                    </p>
                  )}
                </div>

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
                    defaultValue={user?.firstName || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                    defaultValue={user?.lastName || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                {mode === 'create' && (
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password *
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      required
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                        state.errors?.password ? 'border-red-300' : ''
                      }`}
                    />
                    {state.errors?.password && (
                      <p className="mt-1 text-sm text-red-600">
                        {state.errors.password[0]}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    name="isActive"
                    value="true"
                    defaultChecked={user?.isActive ?? true}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="active"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Active
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowAnonymousComments"
                    name="allowAnonymousComments"
                    value="true"
                    defaultChecked={user?.allowAnonymousComments ?? true}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="allowAnonymousComments"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Allow Anonymous Comments
                  </label>
                </div>
              </div>
            </div>

            {/* Comment Token Management - Only in edit mode */}
            {mode === 'edit' && user?.email && (
              <div className="pt-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Comment Token Management
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage the comment verification token for this user&apos;s email address.
                  </p>
                </div>

                <div className="mt-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-yellow-700">
                          Revoking the comment token will prevent this user from using their existing magic links to manage comments. 
                          A new token will be generated automatically when they submit a new comment.
                        </p>
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Are you sure you want to revoke the comment token for this user? Their existing magic links will stop working.')) {
                                const result = await revokeUserCommentToken(user.email!);
                                if (result.success) {
                                  showSuccessAlert(result.message || 'Comment token revoked successfully');
                                } else {
                                  showErrorAlert(result.error || 'Failed to revoke comment token');
                                }
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Revoke Comment Token
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Roles */}
            <div className="pt-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Roles</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Select the roles this user should have.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`role-${role.id}`}
                      checked={selectedRoles.includes(role.id)}
                      onChange={e =>
                        handleRoleChange(role.id, e.target.checked)
                      }
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="ml-2 block text-sm text-gray-900"
                    >
                      {role.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Town Access */}
            <div className="pt-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Town Access
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Grant access to specific towns.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {townAccess.map((access, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <select
                        value={access.townId}
                        onChange={e =>
                          updateTownAccess(index, 'townId', e.target.value)
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Select a town</option>
                        {towns.map(town => (
                          <option key={town.id} value={town.id}>
                            {town.name}, {town.state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <select
                        value={access.accessLevel}
                        onChange={e =>
                          updateTownAccess(index, 'accessLevel', e.target.value)
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="read">Read</option>
                        <option value="write">Write</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTownAccess(index)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTownAccess}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Town Access
                </button>
              </div>
            </div>

            {/* Person Access */}
            <div className="pt-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Person Access
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Grant access to specific persons.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {personAccess.map((access, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <select
                        value={access.personId}
                        onChange={e =>
                          updatePersonAccess(index, 'personId', e.target.value)
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Select a person</option>
                        {persons.map(person => (
                          <option key={person.id} value={person.id}>
                            {person.firstName} {person.lastName} (
                            {person.town.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <select
                        value={access.accessLevel}
                        onChange={e =>
                          updatePersonAccess(
                            index,
                            'accessLevel',
                            e.target.value
                          )
                        }
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="read">Read</option>
                        <option value="write">Write</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePersonAccess(index)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPersonAccess}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Person Access
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-3 bg-gray-50 text-right">
            <Link
              href="/admin/users"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {mode === 'create' ? 'Create User' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
