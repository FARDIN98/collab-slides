import { create } from 'zustand'
import supabase from '../lib/supabase'

const usePresentationStore = create((set, get) => ({
  presentations: [],
  slides: [],
  users: [],
  isLoading: false,
  error: null,
  realtimeSubscription: null,

  // Create a new presentation
  createPresentation: async (title, description, creatorNickname) => {
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('presentations')
        .insert([
          {
            name: title.trim(),
            description: description?.trim() || null,
            creator_nickname: creatorNickname
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Also add the creator as a user with 'creator' role
      const { error: userError } = await supabase
        .from('presentation_users')
        .insert([
          {
            presentation_id: data.id,
            nickname: creatorNickname,
            role: 'creator'
          }
        ])

      if (userError) throw userError

      // Add the new presentation to the local state
      set(state => ({
        presentations: [data, ...state.presentations],
        isLoading: false
      }))

      return data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Fetch all presentations (visible to all users)
  fetchAllPresentations: async (nickname) => {
    set({ isLoading: true, error: null })

    try {
      // Get all presentations
      const { data: allPresentations, error: presentationsError } = await supabase
        .from('presentations')
        .select('*')
        .order('created_at', { ascending: false })

      if (presentationsError) throw presentationsError

      // Get user roles for presentations where user is a member
      const { data: userRoles, error: rolesError } = await supabase
        .from('presentation_users')
        .select('presentation_id, role, joined_at')
        .eq('nickname', nickname)

      if (rolesError) throw rolesError

      // Create a map of user roles by presentation ID
      const roleMap = {}
      userRoles.forEach(role => {
        roleMap[role.presentation_id] = {
          user_role: role.role,
          joined_at: role.joined_at
        }
      })

      // Combine presentations with user roles (if any)
      const presentations = allPresentations.map(presentation => ({
        ...presentation,
        user_role: roleMap[presentation.id]?.user_role || null,
        joined_at: roleMap[presentation.id]?.joined_at || null
      }))

      set({ presentations, isLoading: false })
      return presentations
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Fetch presentations for a user (legacy function - now calls fetchAllPresentations)
  fetchUserPresentations: async (nickname) => {
    return await get().fetchAllPresentations(nickname)
  },

  // Clear presentations
  clearPresentations: () => {
    set({ presentations: [], error: null })
  },

  // Join a presentation (add user to presentation_users if not already there)
  joinPresentation: async (presentationId, nickname) => {
    set({ isLoading: true, error: null })

    try {
      // Use UPSERT to insert or update user in presentation
      // This will prevent duplicates and handle race conditions
      const { error: upsertError } = await supabase
        .from('presentation_users')
        .upsert([
          {
            presentation_id: presentationId,
            nickname: nickname,
            role: 'viewer'
          }
        ], {
          onConflict: 'presentation_id,nickname',
          ignoreDuplicates: true
        })

      if (upsertError) throw upsertError

      // Fetch all users for this presentation
      await get().fetchPresentationUsers(presentationId)
      
      set({ isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Fetch slides for a presentation
  fetchSlides: async (presentationId) => {
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('slides')
        .select('*')
        .eq('presentation_id', presentationId)
        .order('slide_number', { ascending: true })

      if (error) throw error

      set({ slides: data || [], isLoading: false })
      return data
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Fetch users for a presentation
  fetchPresentationUsers: async (presentationId) => {
    try {
      const { data, error } = await supabase
        .from('presentation_users')
        .select('*')
        .eq('presentation_id', presentationId)
        .order('joined_at', { ascending: true })

      if (error) throw error

      set({ users: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // Clear presentations
  clearPresentations: () => {
    set({ presentations: [], error: null })
  },

  // Clear slides
  clearSlides: () => {
    set({ slides: [] })
  },

  // Clear users
  clearUsers: () => {
    set({ users: [] })
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },

  // Update user role (only creators can do this)
  updateUserRole: async (presentationId, targetNickname, newRole, requesterNickname) => {
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase.rpc('update_user_role', {
        target_presentation_id: presentationId,
        target_nickname: targetNickname,
        new_role: newRole,
        requester_nickname: requesterNickname
      })

      if (error) throw error

      // Refresh users list to show updated roles
      await get().fetchPresentationUsers(presentationId)
      
      set({ isLoading: false })
      return true
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Subscribe to realtime updates for presentation users
  subscribeToUserUpdates: (presentationId) => {
    // Unsubscribe from any existing subscription
    get().unsubscribeFromUserUpdates()

    const subscription = supabase
      .channel(`presentation_users_${presentationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentation_users',
          filter: `presentation_id=eq.${presentationId}`
        },
        (payload) => {
          console.log('Realtime update:', payload)
          // Refresh users list when any change occurs
          get().fetchPresentationUsers(presentationId)
        }
      )
      .subscribe()

    set({ realtimeSubscription: subscription })
    return subscription
  },

  // Unsubscribe from realtime updates
  unsubscribeFromUserUpdates: () => {
    const { realtimeSubscription } = get()
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription)
      set({ realtimeSubscription: null })
    }
  },

  // Get current user's role in a presentation
  getCurrentUserRole: (presentationId, nickname) => {
    const { users } = get()
    const currentUser = users.find(user => 
      user.presentation_id === presentationId && user.nickname === nickname
    )
    return currentUser?.role || null
  },

  // Check if current user is creator
  isCurrentUserCreator: (presentationId, nickname) => {
    return get().getCurrentUserRole(presentationId, nickname) === 'creator'
  },

  // Add a new slide (only creators can do this)
  addSlide: async (presentationId, requesterNickname) => {
    // Check if user is creator
    if (!get().isCurrentUserCreator(presentationId, requesterNickname)) {
      throw new Error('Only creators can add slides')
    }

    set({ isLoading: true, error: null })

    try {
      // Get current slides to determine next slide number
      const { slides } = get()
      const nextSlideNumber = slides.length > 0 ? Math.max(...slides.map(s => s.slide_number)) + 1 : 1

      // Insert new slide
      const { data, error } = await supabase
        .from('slides')
        .insert([
          {
            presentation_id: presentationId,
            slide_number: nextSlideNumber,
            content_json: {}
          }
        ])
        .select()

      if (error) throw error

      // Refresh slides list
      await get().fetchSlides(presentationId)
      
      set({ isLoading: false })
      return data[0]
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Remove a slide (only creators can do this)
  removeSlide: async (presentationId, slideId, requesterNickname) => {
    // Check if user is creator
    if (!get().isCurrentUserCreator(presentationId, requesterNickname)) {
      throw new Error('Only creators can remove slides')
    }

    set({ isLoading: true, error: null })

    try {
      // Don't allow removing the last slide
      const { slides } = get()
      if (slides.length <= 1) {
        throw new Error('Cannot remove the last slide')
      }

      // Delete the slide
      const { error } = await supabase
        .from('slides')
        .delete()
        .eq('id', slideId)
        .eq('presentation_id', presentationId)

      if (error) throw error

      // Refresh slides list
      await get().fetchSlides(presentationId)
      
      set({ isLoading: false })
      return true
    } catch (error) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  // Subscribe to realtime updates for slides
  subscribeToSlideUpdates: (presentationId) => {
    // Note: We'll extend the existing user subscription to include slides
    // Unsubscribe from any existing subscription
    get().unsubscribeFromUserUpdates()

    const subscription = supabase
      .channel(`presentation_${presentationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentation_users',
          filter: `presentation_id=eq.${presentationId}`
        },
        (payload) => {
          console.log('User update:', payload)
          // Refresh users list when any change occurs
          get().fetchPresentationUsers(presentationId)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slides',
          filter: `presentation_id=eq.${presentationId}`
        },
        (payload) => {
          console.log('Slide update:', payload)
          // Refresh slides list when any change occurs
          get().fetchSlides(presentationId)
        }
      )
      .subscribe()

    set({ realtimeSubscription: subscription })
    return subscription
  },

  // Update slide content (text blocks)
  updateSlideContent: async (slideId, contentJson, requesterNickname, presentationId) => {
    // Check if user has edit permissions
    const userRole = get().getCurrentUserRole(presentationId, requesterNickname)
    if (!userRole || userRole === 'viewer') {
      throw new Error('Only creators and editors can modify slides')
    }

    try {
      const { error } = await supabase
        .from('slides')
        .update({ 
          content_json: contentJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', slideId)

      if (error) throw error

      // Update local state
      const { slides } = get()
      const updatedSlides = slides.map(slide => 
        slide.id === slideId 
          ? { ...slide, content_json: contentJson, updated_at: new Date().toISOString() }
          : slide
      )
      set({ slides: updatedSlides })

      return true
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  // Check if user can edit slides
  canEditSlides: (presentationId, nickname) => {
    const userRole = get().getCurrentUserRole(presentationId, nickname)
    return userRole === 'creator' || userRole === 'editor'
  }
}))

export default usePresentationStore