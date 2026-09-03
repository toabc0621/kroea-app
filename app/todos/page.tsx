'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Todo = {
  id: string
  task: string
  is_completed: boolean
  created_at: string
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTask, setNewTask] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: sortOrder === 'asc' })

    if (error) console.error(error)
    else setTodos(data || [])
  }

  useEffect(() => {
    fetchTodos()
  }, [sortOrder])

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask) return

    const { error } = await supabase.from('todos').insert([{ task: newTask }])
    if (error) console.error(error)
    else {
      setNewTask('')
      fetchTodos()
    }
  }

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_completed: !currentStatus })
      .eq('id', id)
    
    if (error) console.error(error)
    else fetchTodos()
  }

  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) console.error(error)
    else fetchTodos()
  }

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded shadow">
      <h1 className="text-xl font-bold mb-4">韓国旅行 TODOリスト</h1>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">並び替え:</span>
        <select 
          className="border p-1 rounded text-sm"
          value={sortOrder} 
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
        >
          <option value="desc">新しい順</option>
          <option value="asc">古い順</option>
        </select>
      </div>

      <form onSubmit={addTodo} className="flex gap-2 mb-6">
        <input
          type="text"
          className="border p-2 flex-1 rounded text-sm"
          placeholder="例: eSIMを買う"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button type="submit" className="bg-blue-500 text-white px-4 rounded text-sm">追加</button>
      </form>

      <ul className="space-y-2">
        {todos.map(todo => (
          <li key={todo.id} className="flex items-center justify-between border p-2 rounded">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={todo.is_completed}
                onChange={() => toggleTodo(todo.id, todo.is_completed)}
                className="w-4 h-4"
              />
              <span className={`text-sm ${todo.is_completed ? 'line-through text-gray-400' : ''}`}>
                {todo.task}
              </span>
            </div>
            <button 
              onClick={() => deleteTodo(todo.id)}
              className="text-red-500 text-xs hover:underline"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}