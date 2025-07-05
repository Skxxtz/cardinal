import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import './App.css'

var tagColors: [number, number, number][] = [
    [0, 70, 60],     // Soft red
    [20, 80, 55],    // Coral
    [40, 90, 55],    // Goldenrod
    [60, 70, 60],    // Lemon yellow
    [100, 50, 55],   // Olive green
    [140, 60, 50],   // Mint green
    [170, 65, 55],   // Aqua
    [200, 70, 60],   // Sky blue
    [220, 60, 65],   // Cornflower blue
    [250, 60, 65],   // Lavender
    [280, 65, 60],   // Orchid
    [310, 70, 65],   // Rose
    [330, 75, 60],   // Magenta
];

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
    category: string
}

class CardManager {
    private tags: Map<string, [number, number, number]>
    private cards: Card[]
    private correct: Card[]
    private incorrect: Card[]
    private currentCard: Card
    private iteration: number = 1

    constructor(cards: Card[], tags: Set<string>) {
        let tagColorMap: Map<string, [number, number, number]> = new Map();
        Array.from(tags).forEach((tag, i) => {
            const color = tagColors[i % tagColors.length];
            tagColorMap.set(tag, color);
        });
        this.cards = [...cards]
        this.tags = tagColorMap
        this.currentCard = this.currentCard = cards[0]
        this.correct = []
        this.incorrect = []
    }

    reset() {
        if (this.cards.length != 0 || this.incorrect.length == 0) {
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
        if (pool == this.incorrect) {
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

    getTag(category: string): [number, number, number] {
        return this.tags.get(category) ?? [0, 0, 0];
    }
}

function App() {
    const [error, setError] = useState<CardinalError | null>(null)
    const [manager, setManager] = useState<CardManager | null>(null)
    const [showFront, setShowFront] = useState(true)
    const [leftPressed, setLeftPressed] = useState(false)
    const [rightPressed, setRightPressed] = useState(false)
    const [, forceRerender] = useState(0) // to trigger re-renders

    useEffect(() => {
        async function fetchCards() {
            try {
                const [cards, tags]: [Card[], Set<string>] = await invoke('read_cards', {})
                const cm = new CardManager(cards, tags)
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
                setRightPressed(true)
                if (showFront) {
                    setShowFront(false)
                } else {
                    manager.moveNext(true)
                    setShowFront(true)
                }
                forceRerender((n) => n + 1)
            } else if (event.key === 'ArrowLeft') {
                setLeftPressed(true)
                manager.moveNext(false)
                setShowFront(true)
                forceRerender((n) => n + 1)
            } else if (event.key === 'r' && event.ctrlKey) {
                manager.reset()
                forceRerender((n) => n + 1)
            }
        }
        function handleKeyUp(event: KeyboardEvent) {
            if (event.key == 'ArrowLeft') setLeftPressed(false);
            if (event.key == 'ArrowRight') setRightPressed(false);
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
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
    const color = manager.getTag(card.category)
    return (
        <div className="content">
            <div className="header">

            </div>
            <div className="card-holder">
                <div className="card">
                    <div className="title-holder">
                        <h2>
                        {card.title}
                        </h2>
                        <span
                        className="indicator"
                        style={{
                            background: hsla(color, 0.1),
                            border: `1px solid ${hsla(color, 0.5)}`,
                            color: hsla(color, 0.8)
                        }}>{card.category}</span>

                        {isRefresh && (
                            <span className="refresh-indicator indicator">Previously Incorrect</span>
                        )}
                    </div>
                    <div
                    className="card-body"
                    dangerouslySetInnerHTML={{
                        __html: showFront ? card.front : card.back,
                    }}
                    />
                </div>
            </div>
            <div className="footer">
                <div className="indicators">
                    <p className="correct">{correct} correctly answered</p>
                    <p>{total + 1} cards remaining</p>
                    <p className="incorrect">{incorrect} incorrectly answered</p>
                </div>
                <div className="keys">
                    <div className="keys">
                      <img
                        src="key-left.svg"
                        alt=""
                        id="key-left"
                        className={`key ${leftPressed ? "pressed" : ""}`}
                      />
                      <img
                        src="key-right.svg"
                        alt=""
                        id="key-right"
                        className={`key ${rightPressed ? "pressed" : ""}`}
                      />
                    </div>
                </div>
            </div>
        </div>
    )
}

function hsla([h, s, l]: [number, number, number], a: number): string {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}
export default App

