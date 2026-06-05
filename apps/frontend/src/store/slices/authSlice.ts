import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@ultimate-pos/shared'

export interface AuthState {
  user: User | null
  session: string | null
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Login failed')
    }
    return res.json()
  },
)

export const register = createAsyncThunk(
  'auth/register',
  async (data: { email: string; password: string; name: string; store_name?: string }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Registration failed')
    }
    return res.json()
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload
    },
    setSession(state, action: PayloadAction<string | null>) {
      state.session = action.payload
    },
    logout(state) {
      state.user = null
      state.session = null
      state.error = null
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.session = action.payload.session
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Login failed'
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.session = action.payload.session
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Registration failed'
      })
  },
})

export const { setUser, setSession, logout, clearError } = authSlice.actions
export default authSlice.reducer
