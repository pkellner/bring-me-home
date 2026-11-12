import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isSiteAdmin } from '@/lib/permissions';
import { getPostgresOverview } from '@/lib/postgres-overview';

export const dynamic = 'force-dynamic';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default async function PostgresPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!isSiteAdmin(session)) {
    redirect('/admin');
  }

  const overview = await getPostgresOverview();
  const { database, connections } = overview;
  const totalRows = overview.tables.reduce((sum, table) => sum + table.rowCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Postgres</h1>
        <p className="mt-1 text-sm text-gray-600">
          The database the app is connected to. Read-only.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Database</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Server Version" value={overview.version} />
          <Field label="Database Name" value={database.name} />
          <Field label="Database Size" value={database.sizePretty} />
          <Field
            label="Locale"
            value={`${database.localeProvider}${database.locale ? `, ${database.locale}` : ''}`}
          />
          <Field
            label="Connections"
            value={`${connections.activeConnections} of ${connections.maxConnections} (max_connections)`}
          />
          <Field
            label="Pool connection_limit"
            value={overview.connectionLimit === null ? 'Not set' : String(overview.connectionLimit)}
          />
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Tables ({overview.tables.length}, {totalRows.toLocaleString('en-US')} rows)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rows</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {overview.tables.map(table => (
                <tr key={table.name}>
                  <td className="px-4 py-2 text-sm font-mono text-gray-900">{table.name}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900">
                    {table.rowCount.toLocaleString('en-US')}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-500">{table.sizePretty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Applied Migrations ({overview.migrations.length})
        </h2>
        <ul className="divide-y divide-gray-200">
          {overview.migrations.map(migration => (
            <li key={migration.name} className="py-2 flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-sm font-mono text-gray-900 break-all">{migration.name}</span>
              <span className="text-sm text-gray-500">{new Date(migration.finishedAt).toISOString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
