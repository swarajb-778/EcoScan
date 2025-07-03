<script lang="ts">
  import VoiceInput from '$lib/components/VoiceInput.svelte';
  import DetectionDetails from '$lib/components/DetectionDetails.svelte';
</script>

<svelte:head>
  <title>EcoScan - Voice Classification</title>
  <meta name="description" content="Classify waste items using voice commands" />
</svelte:head>

<div class="flex-1 p-6">
  <VoiceInput />
</div>

<!-- Detection Details Modal (reused from camera view) -->
<DetectionDetails /> 