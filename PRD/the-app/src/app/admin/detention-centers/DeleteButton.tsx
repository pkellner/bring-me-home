'use client';

interface DeleteButtonProps {
  action: (formData: FormData) => Promise<void>;
  id: string;
}

export default function DeleteButton({ action, id }: DeleteButtonProps) {
  return (
    <form action={action} className="inline-block">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        onClick={e => {
          if (
            !confirm('Are you sure you want to delete this detention center?')
          ) {
            e.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
