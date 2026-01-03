export default function PlayerList({ players, currentPlayer }) {
  return (
    <table className="table-auto border-collapse border border-gray-300 w-full mb-4">
      <thead>
        <tr>
          <th className="border px-2 py-1">Players</th>
        </tr>
      </thead>
      <tbody>
        {players.map(p => (
          <tr key={p.id} className={p.name === currentPlayer ? 'bg-yellow-200' : ''}>
            <td className="border px-2 py-1">{p.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
