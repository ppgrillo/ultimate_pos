import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUpload } from './ImageUpload'

describe('ImageUpload', () => {
  it('renders upload placeholder when no image', () => {
    const onChange = vi.fn()
    render(<ImageUpload value={null} onChange={onChange} />)

    expect(screen.getByText('Upload Product Image')).toBeInTheDocument()
    expect(screen.getByText('JPG, PNG (Max 5MB)')).toBeInTheDocument()
  })

  it('renders preview when value is provided', () => {
    const onChange = vi.fn()
    render(<ImageUpload value="data:image/png;base64,test" onChange={onChange} />)

    const img = screen.getByAltText('Product preview')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'data:image/png;base64,test')
  })

  it('calls onChange with null when remove is clicked', async () => {
    const onChange = vi.fn()
    render(<ImageUpload value="data:image/png;base64,test" onChange={onChange} />)

    const removeBtn = screen.getByRole('button')
    await userEvent.click(removeBtn)

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('hides file input', () => {
    const onChange = vi.fn()
    const { container } = render(<ImageUpload value={null} onChange={onChange} />)

    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveClass('hidden')
  })
})
