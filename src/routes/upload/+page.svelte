<script lang="ts">
  import ImageUpload from '$lib/components/ImageUpload.svelte';
  import DetectionDetails from '$lib/components/DetectionDetails.svelte';
</script>

<svelte:head>
  <title>EcoScan - Image Upload</title>
  <meta name="description" content="Upload images to classify waste items" />
</svelte:head>

<div class="flex-1 p-6">
  <ImageUpload />
</div>

<!-- Detection Details Modal -->
<DetectionDetails /> 