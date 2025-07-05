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
    private correct: Card[]
    private incorrect: Card[]
    private currentCard: Card
    private iteration: number = 1

    constructor(cards: Card[]) {
        this.cards = [...cards]
        this.currentCard = this.currentCard = cards[0]
        this.correct = []
        this.incorrect = []
    }

    reset(){
        if (this.cards.length != 0 || this.incorrect.length == 0){
            this.cards.push(...this.correct)
            this.correct = []
        } 

        this.cards.push(...this.incorrect)
        this.incorrect = []
        this.iteration = 1
    }

    getCurrentCard(): Card {
        return this.currentCard
    }

    isRefresh(): boolean {
        const n = 6;
        return (this.cards.length > n && this.incorrect.length > 0 && this.iteration % n == 0)
    }

    moveNext(correct: boolean) {
        const n = 6;
        const wasFailedCard = this.isRefresh()

        this.iteration = (correct || wasFailedCard) ? this.iteration + 1 : this.iteration

        const condition = (this.cards.length > n && this.incorrect.length > 0 && this.iteration % n == 0)
        const pool = condition ? this.incorrect : this.cards

        if (!wasFailedCard) {
            // sort the cards based on correctness
            const target = correct ? this.correct : this.incorrect;
            target.push(this.currentCard)
        }

        // reset the cards
        if (this.cards.length == 0) {
            this.reset()
        }

        // get new random card from available cards 
        let index = Math.floor(Math.random() * pool.length)
        if (pool == this.incorrect){
            this.currentCard = pool[index]
        } else {
            this.currentCard = pool.splice(index, 1)[0]
        }
    }

    getCards(): Card[] {
        return this.cards
    }

    getTotalCards(): [number, number, number] {
        return [this.cards.length, this.correct.length, this.incorrect.length]
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
                        manager.moveNext(true)
                        setShowFront(true)
                        forceRerender((n) => n + 1)
                    }
                } else if (event.key === 'ArrowRight') {
                    if (showFront) {
                        setShowFront(false)
                    } else {
                        manager.moveNext(true)
                        setShowFront(true)
                    }
                    forceRerender((n) => n + 1)
                } else if (event.key === 'ArrowLeft') {
                    manager.moveNext(false)
                    setShowFront(true)
                    forceRerender((n) => n + 1)
                } else if (event.key === 'r' && event.ctrlKey){
                    manager.reset()
                    forceRerender((n) => n + 1)
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
    const [total, correct, incorrect] = manager.getTotalCards()
    const isRefresh = manager.isRefresh()

    return (
        <div className="card">
            <div className="title-holder">
                <h2>
                    {card.title}
                </h2>
                {isRefresh && (
                    <span className="refresh-indicator">Previously Incorrect</span>
                )}
            </div>
            <div className="indicators">
                <p>{total} cards remaining</p>
                <p className="correct">{correct} correctly answered</p>
                <p className="incorrect">{incorrect} incorrectly answered</p>
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

