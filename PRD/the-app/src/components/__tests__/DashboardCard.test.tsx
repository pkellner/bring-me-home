import { render, screen } from '@testing-library/react'
import DashboardCard from '../admin/DashboardCard'

describe('DashboardCard', () => {
  it('renders card with name and value', () => {
    render(
      <DashboardCard
        name="Test Card"
        value={42}
        icon="users"
        href="/test"
      />
    )
    
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })
  
  it('renders with icon', () => {
    render(
      <DashboardCard
        name="Test Card"
        value={42}
        icon="users"
        href="/test"
      />
    )
    
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})