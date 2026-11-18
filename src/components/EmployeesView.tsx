import { useEffect, useState, type FormEvent } from 'react'
import type { Employee } from '../lib/types'
import { useStore } from '../store'

export function EmployeesView() {
  const employees = useStore((s) => s.data.employees)
  const { addEmployee } = useStore.getState()
  const [name, setName] = useState('')

  const onAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addEmployee(name)
    setName('')
  }

  return (
    <section className="panel">
      <h1>Dependientas</h1>
      <p className="muted">El orden de esta lista es el orden de las filas en el calendario y en el PDF.</p>

      <form className="add-row" onSubmit={onAdd}>
        <input
          placeholder="Nombre (p. ej. Marga G.)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre de la nueva dependienta"
        />
        <button className="btn primary" type="submit" disabled={!name.trim()}>
          Añadir
        </button>
      </form>

      {employees.length === 0 ? (
        <p className="muted">Todavía no hay nadie. Añade a la primera arriba.</p>
      ) : (
        <ul className="list">
          {employees.map((e, i) => (
            <EmployeeRow key={e.id} employee={e} first={i === 0} last={i === employees.length - 1} />
          ))}
        </ul>
      )}
    </section>
  )
}

function EmployeeRow({ employee, first, last }: { employee: Employee; first: boolean; last: boolean }) {
  const { updateEmployee, removeEmployee, moveEmployee } = useStore.getState()
  const [name, setName] = useState(employee.name)
  const [hours, setHours] = useState(employee.weeklyHours ? String(employee.weeklyHours) : '')
  // Si cambia desde fuera (deshacer, otro dispositivo) se refleja aquí
  useEffect(() => setName(employee.name), [employee.name])
  useEffect(() => setHours(employee.weeklyHours ? String(employee.weeklyHours) : ''), [employee.weeklyHours])

  const commitName = () => {
    const v = name.trim()
    if (!v) return setName(employee.name)
    if (v !== employee.name) updateEmployee(employee.id, { name: v })
  }

  const commitHours = () => {
    const n = hours.trim() === '' ? null : Number(hours.replace(',', '.'))
    if (n !== null && (!Number.isFinite(n) || n <= 0)) return setHours(employee.weeklyHours ? String(employee.weeklyHours) : '')
    if (n !== (employee.weeklyHours ?? null)) updateEmployee(employee.id, { weeklyHours: n })
  }

  const onRemove = () => {
    if (confirm(`¿Quitar a ${employee.name}? También se borrarán sus horarios (se puede deshacer).`)) {
      removeEmployee(employee.id)
    }
  }

  return (
    <li className="list-row">
      <div className="reorder">
        <button className="btn icon ghost" disabled={first} onClick={() => moveEmployee(employee.id, -1)} aria-label="Subir">
          ↑
        </button>
        <button className="btn icon ghost" disabled={last} onClick={() => moveEmployee(employee.id, 1)} aria-label="Bajar">
          ↓
        </button>
      </div>
      <input
        className="grow"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label="Nombre"
      />
      <label className="inline-field">
        <input
          className="num"
          inputMode="decimal"
          placeholder="—"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={commitHours}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Horas semanales de contrato"
        />
        h/semana
      </label>
      <button className="btn ghost danger-text" onClick={onRemove}>
        Quitar
      </button>
    </li>
  )
}
