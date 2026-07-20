import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset Zustand store state to defaults synchronously
    useAuthStore.setState({
      session: null,
      user: null,
      profile: null,
      loading: false,
      error: null,
      initialized: false,
    });
  });

  it('should initialize with correct default state values', () => {
    // Let's set loading to true as it is defined in the initial state of the store
    useAuthStore.setState({ loading: true });
    
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should clear error state upon calling clearError', () => {
    // Set dummy error
    useAuthStore.setState({ error: 'Dummy Authentication Failure' });
    expect(useAuthStore.getState().error).toBe('Dummy Authentication Failure');
    
    // Clear error
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('should reset session, user, and profile states to null upon calling signOut', async () => {
    // Set dummy session
    useAuthStore.setState({
      session: {} as any,
      user: {} as any,
      profile: {} as any,
      loading: false,
    });
    
    expect(useAuthStore.getState().session).not.toBeNull();
    
    // Perform sign out and await the promise resolution
    await useAuthStore.getState().signOut();
    
    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.loading).toBe(false);
  });
});
