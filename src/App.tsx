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

    useEffect(() => {
        async function fetchCards() {
            try {
                const content: Card[] = await invoke("read_cards", {})
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
    }, [cards])

    return (
        <>
        {error && (
            <div className="error">
            <p>Error: {error.error?.type}</p>
            {error.error?.message && <p>{error.error?.message}</p>}
            {error.traceback && <pre>{error.traceback}</pre>}
            </div>
        )}

        {cards.map((card, idx) => (
            <div key={idx} className="card">
            <h2>{card.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: card.front }} />
            <div dangerouslySetInnerHTML={{ __html: card.back }} />
            </div>
        ))}

        </>
    )
}

export default App

