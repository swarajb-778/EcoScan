<script lang="ts">
  /**
   * Advanced Design System for EcoScan
   * 
   * Features:
   * - Comprehensive component library
   * - Design tokens and theming system
   * - Accessibility-first components
   * - Responsive design patterns
   * - Interactive documentation
   * - Dark/light mode support
   * - Animation and micro-interactions
   * - Form validation and feedback
   * - Data visualization components
   * - Layout and grid systems
   * - Typography and iconography
   * - Color palette and gradients
   * - Spacing and sizing scales
   * - Component variants and states
   * - Semantic design patterns
   */

  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  
  // Design system stores
  const activeSection = writable('overview');
  const darkMode = writable(false);
  const selectedComponent = writable('button');
  const componentProps = writable({});
  
  // Design tokens
  export const designTokens = {
    colors: {
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e'
      },
      secondary: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a'
      },
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d'
      },
      warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f'
      },
      error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d'
      },
      neutral: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717'
      }
    },
    typography: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        display: ['Poppins', 'system-ui', 'sans-serif']
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem'
      },
      fontWeight: {
        thin: '100',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900'
      },
      lineHeight: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2'
      }
    },
    spacing: {
      0: '0',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      8: '2rem',
      10: '2.5rem',
      12: '3rem',
      16: '4rem',
      20: '5rem',
      24: '6rem',
      32: '8rem',
      40: '10rem',
      48: '12rem',
      56: '14rem',
      64: '16rem'
    },
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      base: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      '3xl': '1.5rem',
      full: '9999px'
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
    },
    transitions: {
      fast: '150ms ease-in-out',
      base: '200ms ease-in-out',
      slow: '300ms ease-in-out',
      slower: '500ms ease-in-out'
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    }
  };

  // Component definitions
  const componentLibrary = {
    atoms: {
      button: {
        name: 'Button',
        description: 'Interactive button component with multiple variants',
        props: {
          variant: ['primary', 'secondary', 'outline', 'ghost', 'link'],
          size: ['xs', 'sm', 'md', 'lg', 'xl'],
          disabled: [true, false],
          loading: [true, false],
          icon: ['none', 'left', 'right', 'only'],
          fullWidth: [true, false]
        }
      },
      input: {
        name: 'Input',
        description: 'Form input component with validation and feedback',
        props: {
          type: ['text', 'email', 'password', 'number', 'search', 'url'],
          size: ['sm', 'md', 'lg'],
          state: ['default', 'error', 'success', 'warning'],
          disabled: [true, false],
          placeholder: 'string',
          label: 'string',
          helpText: 'string',
          required: [true, false]
        }
      },
      badge: {
        name: 'Badge',
        description: 'Small status indicator or label',
        props: {
          variant: ['default', 'primary', 'secondary', 'success', 'warning', 'error'],
          size: ['sm', 'md', 'lg'],
          removable: [true, false],
          icon: [true, false]
        }
      },
      avatar: {
        name: 'Avatar',
        description: 'User profile image or initials',
        props: {
          size: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
          src: 'string',
          alt: 'string',
          fallback: 'string',
          status: ['none', 'online', 'offline', 'away', 'busy']
        }
      },
      icon: {
        name: 'Icon',
        description: 'SVG icon component with consistent sizing',
        props: {
          name: 'string',
          size: ['xs', 'sm', 'md', 'lg', 'xl'],
          color: 'string',
          strokeWidth: ['1', '1.5', '2', '2.5', '3']
        }
      }
    },
    molecules: {
      card: {
        name: 'Card',
        description: 'Container component for grouping related content',
        props: {
          variant: ['default', 'elevated', 'outlined', 'filled'],
          padding: ['none', 'sm', 'md', 'lg'],
          interactive: [true, false],
          loading: [true, false]
        }
      },
      dropdown: {
        name: 'Dropdown',
        description: 'Dropdown menu component with keyboard navigation',
        props: {
          trigger: ['click', 'hover', 'focus'],
          placement: ['top', 'bottom', 'left', 'right'],
          size: ['sm', 'md', 'lg'],
          searchable: [true, false],
          multiSelect: [true, false]
        }
      },
      modal: {
        name: 'Modal',
        description: 'Dialog component for focused interactions',
        props: {
          size: ['xs', 'sm', 'md', 'lg', 'xl', 'full'],
          closable: [true, false],
          backdrop: ['blur', 'dark', 'light'],
          centered: [true, false],
          scrollable: [true, false]
        }
      },
      toast: {
        name: 'Toast',
        description: 'Notification component for feedback messages',
        props: {
          type: ['info', 'success', 'warning', 'error'],
          position: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
          duration: 'number',
          dismissible: [true, false],
          action: [true, false]
        }
      },
      accordion: {
        name: 'Accordion',
        description: 'Collapsible content sections',
        props: {
          type: ['single', 'multiple'],
          collapsible: [true, false],
          animated: [true, false],
          disabled: [true, false]
        }
      }
    },
    organisms: {
      dataTable: {
        name: 'Data Table',
        description: 'Advanced table component with sorting, filtering, and pagination',
        props: {
          sortable: [true, false],
          filterable: [true, false],
          paginated: [true, false],
          selectable: ['none', 'single', 'multiple'],
          expandable: [true, false],
          virtual: [true, false]
        }
      },
      form: {
        name: 'Form',
        description: 'Form component with validation and submission handling',
        props: {
          validation: ['client', 'server', 'hybrid'],
          layout: ['vertical', 'horizontal', 'inline'],
          submitText: 'string',
          resetText: 'string',
          loading: [true, false]
        }
      },
      navigation: {
        name: 'Navigation',
        description: 'Main navigation component with responsive behavior',
        props: {
          variant: ['horizontal', 'vertical', 'sidebar'],
          collapse: [true, false],
          sticky: [true, false],
          breadcrumbs: [true, false]
        }
      },
      chart: {
        name: 'Chart',
        description: 'Data visualization component with multiple chart types',
        props: {
          type: ['line', 'bar', 'pie', 'scatter', 'area', 'doughnut'],
          responsive: [true, false],
          animated: [true, false],
          interactive: [true, false],
          legend: [true, false]
        }
      }
    }
  };

  // Current demo state
  let currentCategory = 'atoms';
  let currentComponent = 'button';
  let demoProps = {};

  // Component showcase functions
  function selectCategory(category: string) {
    currentCategory = category;
    const components = Object.keys(componentLibrary[category]);
    currentComponent = components[0];
    updateDemoProps();
  }

  function selectComponent(component: string) {
    currentComponent = component;
    updateDemoProps();
  }

  function updateDemoProps() {
    const component = componentLibrary[currentCategory]?.[currentComponent];
    if (component) {
      demoProps = {};
      Object.entries(component.props).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          demoProps[key] = value[0];
        } else if (value === 'string') {
          demoProps[key] = `Sample ${key}`;
        } else if (value === 'number') {
          demoProps[key] = 100;
        }
      });
    }
  }

  function updateProp(key: string, value: any) {
    demoProps[key] = value;
    demoProps = { ...demoProps };
  }

  // Initialize
  onMount(() => {
    updateDemoProps();
  });

  // Theme toggle
  function toggleTheme() {
    darkMode.update(dark => !dark);
    document.documentElement.classList.toggle('dark');
  }

  // Export design system
  function exportDesignSystem() {
    const designSystem = {
      tokens: designTokens,
      components: componentLibrary,
      version: '1.0.0',
      generated: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(designSystem, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecoscan-design-system.json';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="design-system" class:dark={$darkMode}>
  <!-- Header -->
  <header class="ds-header">
    <div class="ds-header-content">
      <div class="ds-logo">
        <h1>EcoScan Design System</h1>
        <span class="ds-version">v1.0.0</span>
      </div>
      
      <div class="ds-actions">
        <button class="ds-btn ds-btn-ghost" on:click={toggleTheme}>
          {$darkMode ? '☀️' : '🌙'}
        </button>
        <button class="ds-btn ds-btn-primary" on:click={exportDesignSystem}>
          Export
        </button>
      </div>
    </div>
  </header>

  <div class="ds-container">
    <!-- Sidebar Navigation -->
    <nav class="ds-sidebar">
      <div class="ds-nav-section">
        <h3>Foundation</h3>
        <ul class="ds-nav-list">
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'colors'}
              on:click={() => activeSection.set('colors')}
            >
              Colors
            </button>
          </li>
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'typography'}
              on:click={() => activeSection.set('typography')}
            >
              Typography
            </button>
          </li>
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'spacing'}
              on:click={() => activeSection.set('spacing')}
            >
              Spacing
            </button>
          </li>
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'shadows'}
              on:click={() => activeSection.set('shadows')}
            >
              Shadows
            </button>
          </li>
        </ul>
      </div>

      <div class="ds-nav-section">
        <h3>Components</h3>
        <ul class="ds-nav-list">
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'atoms'}
              on:click={() => activeSection.set('atoms')}
            >
              Atoms
            </button>
          </li>
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'molecules'}
              on:click={() => activeSection.set('molecules')}
            >
              Molecules
            </button>
          </li>
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'organisms'}
              on:click={() => activeSection.set('organisms')}
            >
              Organisms
            </button>
          </li>
        </ul>
      </div>

      <div class="ds-nav-section">
        <h3>Patterns</h3>
        <ul class="ds-nav-list">
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'layouts'}
              on:click={() => activeSection.set('layouts')}
            >
              Layouts
            </button>
          </li>
          <li>
            <button 
              class="ds-nav-item" 
              class:active={$activeSection === 'templates'}
              on:click={() => activeSection.set('templates')}
            >
              Templates
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="ds-main">
      {#if $activeSection === 'colors'}
        <section class="ds-section">
          <header class="ds-section-header">
            <h2>Color Palette</h2>
            <p>Our color system is built for accessibility and consistency.</p>
          </header>

          <div class="ds-color-grid">
            {#each Object.entries(designTokens.colors) as [colorName, colorScale]}
              <div class="ds-color-family">
                <h3 class="ds-color-name">{colorName}</h3>
                <div class="ds-color-swatches">
                  {#each Object.entries(colorScale) as [shade, value]}
                    <div class="ds-color-swatch">
                      <div 
                        class="ds-color-preview" 
                        style="background-color: {value}"
                        title="{colorName}-{shade}: {value}"
                      ></div>
                      <div class="ds-color-info">
                        <span class="ds-color-shade">{shade}</span>
                        <span class="ds-color-value">{value}</span>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </section>

      {:else if $activeSection === 'typography'}
        <section class="ds-section">
          <header class="ds-section-header">
            <h2>Typography</h2>
            <p>A type scale that ensures readability and hierarchy.</p>
          </header>

          <div class="ds-typography-demo">
            <div class="ds-type-scale">
              <h3>Type Scale</h3>
              {#each Object.entries(designTokens.typography.fontSize) as [size, value]}
                <div class="ds-type-example" style="font-size: {value}">
                  <span class="ds-type-label">{size} ({value})</span>
                  <span class="ds-type-sample">The quick brown fox jumps over the lazy dog</span>
                </div>
              {/each}
            </div>

            <div class="ds-font-weights">
              <h3>Font Weights</h3>
              {#each Object.entries(designTokens.typography.fontWeight) as [weight, value]}
                <div class="ds-weight-example" style="font-weight: {value}">
                  <span class="ds-weight-label">{weight} ({value})</span>
                  <span class="ds-weight-sample">Sample Text</span>
                </div>
              {/each}
            </div>
          </div>
        </section>

      {:else if $activeSection === 'spacing'}
        <section class="ds-section">
          <header class="ds-section-header">
            <h2>Spacing Scale</h2>
            <p>Consistent spacing creates visual rhythm and hierarchy.</p>
          </header>

          <div class="ds-spacing-demo">
            {#each Object.entries(designTokens.spacing) as [name, value]}
              <div class="ds-spacing-example">
                <div class="ds-spacing-label">{name} ({value})</div>
                <div class="ds-spacing-visual" style="width: {value}; height: 2rem;"></div>
              </div>
            {/each}
          </div>
        </section>

      {:else if $activeSection === 'shadows'}
        <section class="ds-section">
          <header class="ds-section-header">
            <h2>Shadows</h2>
            <p>Elevation system using shadows for depth and focus.</p>
          </header>

          <div class="ds-shadow-demo">
            {#each Object.entries(designTokens.shadows) as [name, value]}
              <div class="ds-shadow-example">
                <div class="ds-shadow-card" style="box-shadow: {value}">
                  <div class="ds-shadow-label">{name}</div>
                  <div class="ds-shadow-value">{value}</div>
                </div>
              </div>
            {/each}
          </div>
        </section>

      {:else if ['atoms', 'molecules', 'organisms'].includes($activeSection)}
        <section class="ds-section">
          <header class="ds-section-header">
            <h2>{$activeSection.charAt(0).toUpperCase() + $activeSection.slice(1)}</h2>
            <p>Component library for {$activeSection}.</p>
          </header>

          <div class="ds-component-showcase">
            <!-- Component Selector -->
            <div class="ds-component-selector">
              {#each Object.entries(componentLibrary[$activeSection]) as [key, component]}
                <button 
                  class="ds-component-tab"
                  class:active={currentComponent === key}
                  on:click={() => selectComponent(key)}
                >
                  {component.name}
                </button>
              {/each}
            </div>

            <!-- Component Demo -->
            {#if componentLibrary[$activeSection][currentComponent]}
              {@const component = componentLibrary[$activeSection][currentComponent]}
              
              <div class="ds-component-demo">
                <div class="ds-component-preview">
                  <h3>{component.name}</h3>
                  <p>{component.description}</p>
                  
                  <!-- Component Preview Area -->
                  <div class="ds-preview-area">
                    {#if currentComponent === 'button'}
                      <button 
                        class="ds-demo-button"
                        class:ds-btn-primary={demoProps.variant === 'primary'}
                        class:ds-btn-secondary={demoProps.variant === 'secondary'}
                        class:ds-btn-outline={demoProps.variant === 'outline'}
                        class:ds-btn-ghost={demoProps.variant === 'ghost'}
                        class:ds-btn-link={demoProps.variant === 'link'}
                        class:ds-btn-sm={demoProps.size === 'sm'}
                        class:ds-btn-md={demoProps.size === 'md'}
                        class:ds-btn-lg={demoProps.size === 'lg'}
                        class:ds-btn-xl={demoProps.size === 'xl'}
                        disabled={demoProps.disabled}
                      >
                        {demoProps.loading ? 'Loading...' : 'Button'}
                      </button>
                    {:else if currentComponent === 'input'}
                      <div class="ds-input-group">
                        {#if demoProps.label}
                          <label class="ds-label">{demoProps.label}</label>
                        {/if}
                        <input 
                          type={demoProps.type}
                          placeholder={demoProps.placeholder}
                          class="ds-input"
                          class:ds-input-sm={demoProps.size === 'sm'}
                          class:ds-input-md={demoProps.size === 'md'}
                          class:ds-input-lg={demoProps.size === 'lg'}
                          class:ds-input-error={demoProps.state === 'error'}
                          class:ds-input-success={demoProps.state === 'success'}
                          class:ds-input-warning={demoProps.state === 'warning'}
                          disabled={demoProps.disabled}
                          required={demoProps.required}
                        />
                        {#if demoProps.helpText}
                          <span class="ds-help-text">{demoProps.helpText}</span>
                        {/if}
                      </div>
                    {:else if currentComponent === 'badge'}
                      <span 
                        class="ds-badge"
                        class:ds-badge-primary={demoProps.variant === 'primary'}
                        class:ds-badge-secondary={demoProps.variant === 'secondary'}
                        class:ds-badge-success={demoProps.variant === 'success'}
                        class:ds-badge-warning={demoProps.variant === 'warning'}
                        class:ds-badge-error={demoProps.variant === 'error'}
                        class:ds-badge-sm={demoProps.size === 'sm'}
                        class:ds-badge-md={demoProps.size === 'md'}
                        class:ds-badge-lg={demoProps.size === 'lg'}
                      >
                        Badge
                        {#if demoProps.removable}
                          <button class="ds-badge-remove">×</button>
                        {/if}
                      </span>
                    {:else if currentComponent === 'card'}
                      <div 
                        class="ds-card"
                        class:ds-card-elevated={demoProps.variant === 'elevated'}
                        class:ds-card-outlined={demoProps.variant === 'outlined'}
                        class:ds-card-filled={demoProps.variant === 'filled'}
                        class:ds-card-interactive={demoProps.interactive}
                        class:ds-card-loading={demoProps.loading}
                      >
                        <div class="ds-card-content">
                          <h4>Card Title</h4>
                          <p>This is a sample card component with various styling options.</p>
                          <button class="ds-btn ds-btn-primary ds-btn-sm">Action</button>
                        </div>
                      </div>
                    {:else}
                      <div class="ds-placeholder">
                        Component preview for {component.name}
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Component Props -->
                <div class="ds-component-props">
                  <h4>Properties</h4>
                  <div class="ds-props-grid">
                    {#each Object.entries(component.props) as [propName, propOptions]}
                      <div class="ds-prop-control">
                        <label class="ds-prop-label">{propName}</label>
                        {#if Array.isArray(propOptions)}
                          <select 
                            class="ds-prop-select"
                            bind:value={demoProps[propName]}
                            on:change={() => updateProp(propName, demoProps[propName])}
                          >
                            {#each propOptions as option}
                              <option value={option}>{option}</option>
                            {/each}
                          </select>
                        {:else if propOptions === 'string'}
                          <input 
                            type="text"
                            class="ds-prop-input"
                            bind:value={demoProps[propName]}
                            on:input={() => updateProp(propName, demoProps[propName])}
                          />
                        {:else if propOptions === 'number'}
                          <input 
                            type="number"
                            class="ds-prop-input"
                            bind:value={demoProps[propName]}
                            on:input={() => updateProp(propName, demoProps[propName])}
                          />
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </section>

      {:else if $activeSection === 'layouts'}
        <section class="ds-section">
          <header class="ds-section-header">
            <h2>Layout Patterns</h2>
            <p>Common layout patterns and grid systems.</p>
          </header>

          <div class="ds-layout-showcase">
            <div class="ds-layout-example">
              <h3>Grid System</h3>
              <div class="ds-grid ds-grid-12">
                <div class="ds-grid-item ds-col-12">12 columns</div>
                <div class="ds-grid-item ds-col-6">6 columns</div>
                <div class="ds-grid-item ds-col-6">6 columns</div>
                <div class="ds-grid-item ds-col-4">4 columns</div>
                <div class="ds-grid-item ds-col-4">4 columns</div>
                <div class="ds-grid-item ds-col-4">4 columns</div>
                <div class="ds-grid-item ds-col-3">3 columns</div>
                <div class="ds-grid-item ds-col-3">3 columns</div>
                <div class="ds-grid-item ds-col-3">3 columns</div>
                <div class="ds-grid-item ds-col-3">3 columns</div>
              </div>
            </div>

            <div class="ds-layout-example">
              <h3>Flexbox Utilities</h3>
              <div class="ds-flex-demo">
                <div class="ds-flex ds-justify-between ds-items-center">
                  <span>Left</span>
                  <span>Center</span>
                  <span>Right</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      {:else}
        <section class="ds-section">
          <header class="ds-section-header">
            <h2>Overview</h2>
            <p>Welcome to the EcoScan Design System.</p>
          </header>

          <div class="ds-overview">
            <div class="ds-overview-stats">
              <div class="ds-stat">
                <span class="ds-stat-number">{Object.keys(designTokens.colors).length}</span>
                <span class="ds-stat-label">Color Families</span>
              </div>
              <div class="ds-stat">
                <span class="ds-stat-number">{Object.keys(componentLibrary.atoms).length + Object.keys(componentLibrary.molecules).length + Object.keys(componentLibrary.organisms).length}</span>
                <span class="ds-stat-label">Components</span>
              </div>
              <div class="ds-stat">
                <span class="ds-stat-number">{Object.keys(designTokens.spacing).length}</span>
                <span class="ds-stat-label">Spacing Values</span>
              </div>
            </div>

            <div class="ds-overview-features">
              <div class="ds-feature">
                <h3>🎨 Design Tokens</h3>
                <p>Consistent design decisions codified as tokens for colors, typography, spacing, and more.</p>
              </div>
              <div class="ds-feature">
                <h3>🧩 Components</h3>
                <p>Reusable UI components built with accessibility and performance in mind.</p>
              </div>
              <div class="ds-feature">
                <h3>📱 Responsive</h3>
                <p>Mobile-first design approach with responsive patterns and breakpoints.</p>
              </div>
              <div class="ds-feature">
                <h3>♿ Accessible</h3>
                <p>WCAG 2.1 AA compliant components with keyboard navigation and screen reader support.</p>
              </div>
            </div>
          </div>
        </section>
      {/if}
    </main>
  </div>
</div>

<style>
  /* Design System Styles */
  .design-system {
    min-height: 100vh;
    background: var(--ds-bg-primary, #ffffff);
    color: var(--ds-text-primary, #1f2937);
    transition: all 0.2s ease;
  }

  .design-system.dark {
    --ds-bg-primary: #111827;
    --ds-bg-secondary: #1f2937;
    --ds-text-primary: #f9fafb;
    --ds-text-secondary: #d1d5db;
    --ds-border: #374151;
  }

  .design-system:not(.dark) {
    --ds-bg-primary: #ffffff;
    --ds-bg-secondary: #f9fafb;
    --ds-text-primary: #1f2937;
    --ds-text-secondary: #6b7280;
    --ds-border: #e5e7eb;
  }

  /* Header */
  .ds-header {
    background: var(--ds-bg-secondary);
    border-bottom: 1px solid var(--ds-border);
    padding: 1rem 0;
  }

  .ds-header-content {
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ds-logo h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    display: inline;
  }

  .ds-version {
    background: #3b82f6;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  .ds-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Container */
  .ds-container {
    max-width: 1440px;
    margin: 0 auto;
    display: flex;
    min-height: calc(100vh - 80px);
  }

  /* Sidebar */
  .ds-sidebar {
    width: 280px;
    background: var(--ds-bg-secondary);
    border-right: 1px solid var(--ds-border);
    padding: 2rem 0;
    overflow-y: auto;
  }

  .ds-nav-section {
    margin-bottom: 2rem;
    padding: 0 1.5rem;
  }

  .ds-nav-section h3 {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ds-text-secondary);
    margin: 0 0 1rem 0;
  }

  .ds-nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .ds-nav-item {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    text-align: left;
    border: none;
    background: transparent;
    color: var(--ds-text-primary);
    border-radius: 0.375rem;
    transition: background-color 0.15s ease;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .ds-nav-item:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .ds-nav-item.active {
    background: #3b82f6;
    color: white;
  }

  /* Main Content */
  .ds-main {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  .ds-section {
    max-width: 1000px;
  }

  .ds-section-header {
    margin-bottom: 2rem;
  }

  .ds-section-header h2 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }

  .ds-section-header p {
    font-size: 1.125rem;
    color: var(--ds-text-secondary);
    margin: 0;
  }

  /* Color Grid */
  .ds-color-grid {
    display: grid;
    gap: 2rem;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  .ds-color-family {
    background: var(--ds-bg-secondary);
    border-radius: 0.5rem;
    padding: 1.5rem;
    border: 1px solid var(--ds-border);
  }

  .ds-color-name {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    text-transform: capitalize;
  }

  .ds-color-swatches {
    display: grid;
    gap: 0.5rem;
  }

  .ds-color-swatch {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .ds-color-preview {
    width: 3rem;
    height: 2rem;
    border-radius: 0.25rem;
    border: 1px solid var(--ds-border);
  }

  .ds-color-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .ds-color-shade {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .ds-color-value {
    font-size: 0.75rem;
    color: var(--ds-text-secondary);
    font-family: monospace;
  }

  /* Typography Demo */
  .ds-typography-demo {
    display: grid;
    gap: 3rem;
    grid-template-columns: 1fr 1fr;
  }

  .ds-type-scale,
  .ds-font-weights {
    background: var(--ds-bg-secondary);
    border-radius: 0.5rem;
    padding: 1.5rem;
    border: 1px solid var(--ds-border);
  }

  .ds-type-scale h3,
  .ds-font-weights h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .ds-type-example,
  .ds-weight-example {
    margin-bottom: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--ds-border);
  }

  .ds-type-example:last-child,
  .ds-weight-example:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .ds-type-label,
  .ds-weight-label {
    display: block;
    font-size: 0.75rem;
    color: var(--ds-text-secondary);
    margin-bottom: 0.25rem;
  }

  /* Spacing Demo */
  .ds-spacing-demo {
    display: grid;
    gap: 1rem;
  }

  .ds-spacing-example {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--ds-bg-secondary);
    border-radius: 0.375rem;
    border: 1px solid var(--ds-border);
  }

  .ds-spacing-label {
    width: 8rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .ds-spacing-visual {
    background: #3b82f6;
    border-radius: 0.25rem;
  }

  /* Shadow Demo */
  .ds-shadow-demo {
    display: grid;
    gap: 2rem;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .ds-shadow-card {
    background: var(--ds-bg-secondary);
    border-radius: 0.5rem;
    padding: 1.5rem;
    text-align: center;
  }

  .ds-shadow-label {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .ds-shadow-value {
    font-size: 0.75rem;
    color: var(--ds-text-secondary);
    font-family: monospace;
  }

  /* Component Showcase */
  .ds-component-showcase {
    background: var(--ds-bg-secondary);
    border-radius: 0.5rem;
    border: 1px solid var(--ds-border);
    overflow: hidden;
  }

  .ds-component-selector {
    display: flex;
    border-bottom: 1px solid var(--ds-border);
    background: var(--ds-bg-primary);
  }

  .ds-component-tab {
    padding: 1rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--ds-text-secondary);
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .ds-component-tab:hover {
    color: var(--ds-text-primary);
    background: rgba(59, 130, 246, 0.05);
  }

  .ds-component-tab.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .ds-component-demo {
    display: grid;
    grid-template-columns: 1fr 300px;
  }

  .ds-component-preview {
    padding: 2rem;
  }

  .ds-component-preview h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .ds-component-preview p {
    color: var(--ds-text-secondary);
    margin: 0 0 2rem 0;
  }

  .ds-preview-area {
    background: var(--ds-bg-primary);
    border: 1px solid var(--ds-border);
    border-radius: 0.5rem;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .ds-component-props {
    background: var(--ds-bg-primary);
    border-left: 1px solid var(--ds-border);
    padding: 2rem;
  }

  .ds-component-props h4 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 1.5rem 0;
  }

  .ds-props-grid {
    display: grid;
    gap: 1rem;
  }

  .ds-prop-control {
    display: grid;
    gap: 0.5rem;
  }

  .ds-prop-label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  .ds-prop-select,
  .ds-prop-input {
    padding: 0.5rem;
    border: 1px solid var(--ds-border);
    border-radius: 0.375rem;
    background: var(--ds-bg-secondary);
    color: var(--ds-text-primary);
    font-size: 0.875rem;
  }

  /* Button Styles */
  .ds-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid transparent;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s ease;
    background: transparent;
  }

  .ds-btn-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .ds-btn-primary:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .ds-btn-secondary {
    background: var(--ds-bg-secondary);
    color: var(--ds-text-primary);
    border-color: var(--ds-border);
  }

  .ds-btn-outline {
    background: transparent;
    color: #3b82f6;
    border-color: #3b82f6;
  }

  .ds-btn-ghost {
    background: transparent;
    color: var(--ds-text-primary);
    border-color: transparent;
  }

  .ds-btn-ghost:hover {
    background: var(--ds-bg-secondary);
  }

  .ds-btn-link {
    background: transparent;
    color: #3b82f6;
    border: none;
    text-decoration: underline;
  }

  .ds-btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .ds-btn-md {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .ds-btn-lg {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  .ds-btn-xl {
    padding: 1rem 2rem;
    font-size: 1.125rem;
  }

  /* Input Styles */
  .ds-input-group {
    display: grid;
    gap: 0.5rem;
  }

  .ds-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ds-text-primary);
  }

  .ds-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--ds-border);
    border-radius: 0.375rem;
    background: var(--ds-bg-primary);
    color: var(--ds-text-primary);
    font-size: 0.875rem;
    transition: border-color 0.15s ease;
  }

  .ds-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .ds-input-sm {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }

  .ds-input-lg {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }

  .ds-input-error {
    border-color: #ef4444;
  }

  .ds-input-success {
    border-color: #22c55e;
  }

  .ds-input-warning {
    border-color: #f59e0b;
  }

  .ds-help-text {
    font-size: 0.75rem;
    color: var(--ds-text-secondary);
  }

  /* Badge Styles */
  .ds-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1;
  }

  .ds-badge-primary {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .ds-badge-secondary {
    background: var(--ds-bg-secondary);
    color: var(--ds-text-secondary);
  }

  .ds-badge-success {
    background: #dcfce7;
    color: #166534;
  }

  .ds-badge-warning {
    background: #fef3c7;
    color: #92400e;
  }

  .ds-badge-error {
    background: #fee2e2;
    color: #991b1b;
  }

  .ds-badge-sm {
    padding: 0.125rem 0.375rem;
    font-size: 0.625rem;
  }

  .ds-badge-lg {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .ds-badge-remove {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    margin-left: 0.25rem;
  }

  /* Card Styles */
  .ds-card {
    background: var(--ds-bg-primary);
    border-radius: 0.5rem;
    overflow: hidden;
    transition: all 0.15s ease;
  }

  .ds-card-elevated {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .ds-card-outlined {
    border: 1px solid var(--ds-border);
  }

  .ds-card-filled {
    background: var(--ds-bg-secondary);
  }

  .ds-card-interactive {
    cursor: pointer;
  }

  .ds-card-interactive:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.1);
  }

  .ds-card-content {
    padding: 1.5rem;
  }

  .ds-card-content h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .ds-card-content p {
    margin: 0 0 1rem 0;
    color: var(--ds-text-secondary);
  }

  /* Overview Styles */
  .ds-overview-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .ds-stat {
    text-align: center;
    padding: 2rem;
    background: var(--ds-bg-secondary);
    border-radius: 0.5rem;
    border: 1px solid var(--ds-border);
  }

  .ds-stat-number {
    display: block;
    font-size: 2.5rem;
    font-weight: 700;
    color: #3b82f6;
    margin-bottom: 0.5rem;
  }

  .ds-stat-label {
    color: var(--ds-text-secondary);
    font-size: 0.875rem;
  }

  .ds-overview-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }

  .ds-feature {
    background: var(--ds-bg-secondary);
    padding: 2rem;
    border-radius: 0.5rem;
    border: 1px solid var(--ds-border);
  }

  .ds-feature h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .ds-feature p {
    margin: 0;
    color: var(--ds-text-secondary);
  }

  /* Layout Demo */
  .ds-grid {
    display: grid;
    gap: 1rem;
    margin: 1rem 0;
  }

  .ds-grid-12 {
    grid-template-columns: repeat(12, 1fr);
  }

  .ds-grid-item {
    background: #3b82f6;
    color: white;
    padding: 1rem;
    border-radius: 0.25rem;
    text-align: center;
    font-size: 0.875rem;
  }

  .ds-col-3 { grid-column: span 3; }
  .ds-col-4 { grid-column: span 4; }
  .ds-col-6 { grid-column: span 6; }
  .ds-col-12 { grid-column: span 12; }

  .ds-flex {
    display: flex;
  }

  .ds-justify-between {
    justify-content: space-between;
  }

  .ds-items-center {
    align-items: center;
  }

  .ds-flex-demo {
    background: var(--ds-bg-secondary);
    padding: 1rem;
    border-radius: 0.375rem;
    border: 1px solid var(--ds-border);
  }

  /* Utility Classes */
  .ds-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 150px;
    background: var(--ds-bg-secondary);
    border: 2px dashed var(--ds-border);
    border-radius: 0.375rem;
    color: var(--ds-text-secondary);
    font-style: italic;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .ds-container {
      flex-direction: column;
    }

    .ds-sidebar {
      width: 100%;
      padding: 1rem 0;
      border-right: none;
      border-bottom: 1px solid var(--ds-border);
    }

    .ds-nav-section {
      padding: 0 1rem;
      margin-bottom: 1rem;
    }

    .ds-main {
      padding: 1rem;
    }

    .ds-component-demo {
      grid-template-columns: 1fr;
    }

    .ds-component-props {
      border-left: none;
      border-top: 1px solid var(--ds-border);
    }

    .ds-typography-demo {
      grid-template-columns: 1fr;
    }

    .ds-color-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .ds-header-content {
      padding: 0 1rem;
    }

    .ds-component-selector {
      flex-wrap: wrap;
    }

    .ds-component-tab {
      flex: 1;
      min-width: 120px;
      text-align: center;
    }

    .ds-overview-stats {
      grid-template-columns: 1fr;
    }

    .ds-overview-features {
      grid-template-columns: 1fr;
    }
  }
</style> 