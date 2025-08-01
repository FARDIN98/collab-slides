import { create } from 'zustand'

// Helper functions for localStorage
const getStoredNickname = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('collab-slides-nickname') || ''
  }
  return ''
}

const setStoredNickname = (nickname) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('collab-slides-nickname', nickname)
  }
}

const removeStoredNickname = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('collab-slides-nickname')
  }
}

const useAuthStore = create((set, get) => ({
  nickname: getStoredNickname(),
  isLoading: false,

  // Set nickname and proceed to presentations
  setNickname: async (name) => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      throw new Error('Nickname cannot be empty')
    }

    set({ isLoading: true })

    // Simulate a brief loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 500))

    // Store in localStorage
    setStoredNickname(trimmedName)

    set({
      nickname: trimmedName,
      isLoading: false
    })

    return { nickname: trimmedName }
  },

  // Clear nickname
  clearNickname: () => {
    // Remove from localStorage
    removeStoredNickname()
    
    set({
      nickname: '',
      isLoading: false
    })
  },

  // Check if user has set a nickname
  hasNickname: () => {
    const { nickname } = get()
    return nickname.trim().length > 0
  }
}))

export default useAuthStore