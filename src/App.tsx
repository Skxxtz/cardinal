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
    ef: number
}

class CardManager {
    private cards: Card[]
    private currentIndex: number = 0

    constructor(cards: Card[]) {
        this.cards = [...cards]
    }

    getCurrentCard(): Card {
        return this.cards[this.currentIndex]
    }

    moveNext() {
        this.currentIndex = (this.currentIndex + 1) % this.cards.length
    }

    movePrevious() {
        this.currentIndex = this.currentIndex === 0 ? this.cards.length - 1 : this.currentIndex - 1
    }

    rateCard(rating: 1 | 2 | 3 | 4 | 5) {
        const efDelta = [-0.3, -0.15, 0, 0.1, 0.2]
        this.cards[this.currentIndex].ef += efDelta[rating - 1]
        if (this.cards[this.currentIndex].ef < 1.3) {
            this.cards[this.currentIndex].ef = 1.3
        }
    }

    getCards(): Card[] {
        return this.cards
    }

    getCurrentIndex(): number {
        return this.currentIndex
    }

    getTotalCards(): number {
        return this.cards.length
    }
}

function App() {
    const [error, setError] = useState<CardinalError | null>(null)
    const [manager, setManager] = useState<CardManager | null>(null)
    const [showFront, setShowFront] = useState(true)
    const [, forceRerender] = useState(0) // to trigger re-renders

    useEffect(() => {
        async function fetchCards() {
            try {
                const content: Card[] = await invoke('read_cards', {})
                const cm = new CardManager(content)
                setManager(cm)
            } catch (e) {
                setError(e as CardinalError)
            }
        }
        fetchCards()
    }, [])

    useEffect(() => {
        hljs.highlightAll()
    }, [manager, showFront])

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (!manager) return

                if (event.key === 'Enter') {
                    if (showFront) {
                        setShowFront(false)
                    } else {
                        manager.moveNext()
                        setShowFront(true)
                        forceRerender((n) => n + 1)
                    }
                } else if (event.key === 'ArrowLeft') {
                    if (showFront) {
                        manager.movePrevious()
                    }
                    setShowFront(true)
                    forceRerender((n) => n + 1)
                } else if (event.key === 'ArrowRight') {
                    if (showFront) {
                        setShowFront(false)
                    } else {
                        manager.moveNext()
                        setShowFront(true)
                    }
                    forceRerender((n) => n + 1)
                } else if (['1', '2', '3', '4', '5'].includes(event.key)) {
                    const rating = parseInt(event.key) as 1 | 2 | 3 | 4 | 5
                    manager.rateCard(rating)
                    console.log(`Rated EF=${manager.getCurrentCard().ef.toFixed(2)}`)
                }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [manager, showFront])

    if (error) {
        return (
            <div className="error">
            <p>Error: {error.error?.type}</p>
            {error.error?.message && <p>{error.error?.message}</p>}
            {error.traceback && <pre>{error.traceback}</pre>}
            </div>
        )
    }

    if (!manager) {
        return <p>Loading cards...</p>
    }

    const card = manager.getCurrentCard()

    return (
        <div className="card">
        <div className="title-holder">
        <h2>{card.title}</h2>
        <div className="indicators">
        <p>
        card {manager.getCurrentIndex() + 1} of {manager.getTotalCards()}
        </p>
        </div>
        </div>
        <div
        dangerouslySetInnerHTML={{
            __html: showFront ? card.front : card.back,
        }}
        />
        </div>
    )
}

export default App

