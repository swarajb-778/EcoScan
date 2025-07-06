<script lang="ts">
    import DevTools from '$lib/components/DevTools.svelte';
    import { dev } from '$app/environment';
</script>

{#if dev}
    <div class="container mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">Developer Tools</h1>
        <p class="mb-4">These tools are only available in development mode.</p>
        <DevTools />
    </div>
{:else}
    <div class="container mx-auto p-4 text-center">
        <h1 class="text-2xl font-bold text-error">Access Denied</h1>
        <p>This page is only available in development mode.</p>
    </div>
{/if} 