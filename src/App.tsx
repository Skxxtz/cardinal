import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import './App.css'

type CardinalError = {
  error?: {
    type?: string
    message?: string
  }
  traceback?: string
}

type Card = {
  title: string
  front: string
  back: string
}

function App() {
  const [error, setError] = useState<CardinalError | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFront, setShowFront] = useState(true)

  useEffect(() => {
    async function fetchCards() {
      try {
        const content: Card[] = await invoke('read_cards', {})
        console.log(content)
        setCards(content)
      } catch (e) {
        setError(e as CardinalError)
      }
    }
    fetchCards()
  }, [])

  useEffect(() => {
    if (cards.length > 0) {
      hljs.highlightAll()
    }
  }, [cards, currentIndex, showFront]) // Highlight when card or side changes

  useEffect(() => {
      function handleKeyDown(event: KeyboardEvent) {
          if (event.key === 'Enter') {
              if (showFront) {
                  // Switch to back of same card
                  setShowFront(false)
              } else {
                  // Move to next card front
                  setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length)
                  setShowFront(true)
              }
          } else if (event.key === 'ArrowLeft') {
              if (showFront) {
                  // Get previous card
                  setCurrentIndex((prevIndex) => (prevIndex === 0 ? cards.length - 1 : prevIndex - 1))
              } else {
                  // Move to front of current card
                  setShowFront(true)
              }
          } else if (event.key == 'ArrowRight') {
              if (showFront) {
                  // Switch to back of same card
                  setShowFront(false)
              } else {
                  // Move to next card front
                  setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length)
                  setShowFront(true)
              }
          }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFront, cards.length])

  if (error) {
    return (
      <div className="error">
        <p>Error: {error.error?.type}</p>
        {error.error?.message && <p>{error.error?.message}</p>}
        {error.traceback && <pre>{error.traceback}</pre>}
      </div>
    )
  }

  if (cards.length === 0) {
    return <p>Loading cards...</p>
  }

  const card = cards[currentIndex]

  return (
    <div className="card">
      <h2>{card.title}</h2>
      <div
        dangerouslySetInnerHTML={{
          __html: showFront ? card.front : card.back,
        }}
      />
    </div>
  )
}

export default App

