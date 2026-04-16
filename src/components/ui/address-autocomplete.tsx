'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import usePlacesAutocomplete, { getGeocode } from 'use-places-autocomplete'
import { useApiIsLoaded } from '@vis.gl/react-google-maps'
import { cn } from '@/lib/utils'

export type AddressComponents = {
  street_address: string
  city: string
  state: string
  zip_code: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  onSelect: (components: AddressComponents) => void
  placeholder?: string
  className?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = '123 Main Street',
  className,
}: Props) {
  const apiIsLoaded = useApiIsLoaded()

  const {
    ready,
    suggestions: { status, data },
    setValue: setQuery,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    initOnMount: false,
    debounce: 300,
    requestOptions: {
      componentRestrictions: { country: 'us' },
      types: ['address'],
    },
  })

  // Initialize once the Google Maps API is loaded
  useEffect(() => {
    if (apiIsLoaded) init()
  }, [apiIsLoaded, init])

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Sync external value into the hook
  useEffect(() => {
    setQuery(value, false)
  }, [value, setQuery])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        clearSuggestions()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [clearSuggestions])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    setQuery(val)
    setOpen(true)
    setActiveIndex(-1)
  }

  const handleSelect = useCallback(
    async (description: string) => {
      setOpen(false)
      clearSuggestions()
      setActiveIndex(-1)

      try {
        const results = await getGeocode({ address: description })
        const place = results[0]
        if (!place) return

        let streetNumber = ''
        let route = ''
        let city = ''
        let state = ''
        let zip = ''

        for (const component of place.address_components) {
          const types = component.types
          if (types.includes('street_number')) streetNumber = component.long_name
          if (types.includes('route')) route = component.short_name
          if (types.includes('locality')) city = component.long_name
          if (types.includes('sublocality_level_1') && !city) city = component.long_name
          if (types.includes('neighborhood') && !city) city = component.long_name
          if (types.includes('postal_town') && !city) city = component.long_name
          if (types.includes('administrative_area_level_2') && !city) city = component.long_name
          if (types.includes('administrative_area_level_1')) state = component.short_name
          if (types.includes('postal_code')) zip = component.long_name
        }

        const street = streetNumber ? `${streetNumber} ${route}` : route

        onSelect({
          street_address: street,
          city,
          state,
          zip_code: zip,
        })
      } catch {
        // Attempt to parse from the description string
        // Google Places descriptions follow: "Street, City, State, Country" or "Street, City, State ZIP, Country"
        const parts = description.split(',').map((s) => s.trim())
        if (parts.length >= 3) {
          const street = parts[0]
          const city = parts[1]
          const stateZip = parts[2].trim()
          const stateZipMatch = stateZip.match(/^([A-Z]{2})(?:\s+(\d{5}))?$/)

          onSelect({
            street_address: street,
            city: city || '',
            state: stateZipMatch?.[1] || '',
            zip_code: stateZipMatch?.[2] || '',
          })
        } else {
          onChange(description)
        }
      }
    },
    [onChange, onSelect, clearSuggestions, setQuery]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || data.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i < data.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i > 0 ? i - 1 : data.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && data[activeIndex]) {
        handleSelect(data[activeIndex].description)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      clearSuggestions()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const showDropdown = open && status === 'OK' && data.length > 0

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInput}
        onFocus={() => {
          if (data.length > 0) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        disabled={!ready}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        className={cn(
          'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm',
          className
        )}
      />

      {showDropdown && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-auto rounded-xl border bg-white shadow-lg"
          style={{ maxHeight: 240, borderColor: '#e5e5e5' }}
        >
          {data.map((suggestion, index) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion
            const isActive = index === activeIndex
            return (
              <li
                key={place_id}
                role="option"
                aria-selected={isActive}
                className={cn(
                  'cursor-pointer px-3.5 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-[#fdf2f2]' : 'hover:bg-gray-50'
                )}
                onMouseDown={() => handleSelect(suggestion.description)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="font-medium" style={{ color: '#222' }}>
                  {main_text}
                </span>{' '}
                <span style={{ color: '#888' }}>{secondary_text}</span>
              </li>
            )
          })}
          <li className="px-3.5 py-1.5 text-[10px] text-right" style={{ color: '#bbb' }}>
            Powered by Google
          </li>
        </ul>
      )}
    </div>
  )
}
