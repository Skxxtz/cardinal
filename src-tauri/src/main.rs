// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod card;
mod error;
mod utils;
use card::Card;

use std::{
    collections::HashSet, env, fs::File, io::{BufRead, BufReader}, path::PathBuf
};

use crate::{
    error::{CardinalError, CardinalErrorType},
    utils::expand_tilde,
};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_cards])
        .run(tauri::generate_context!())
        .expect("Error running tauri backend");
}

#[tauri::command]
fn read_cards() -> Result<(Vec<Card>, HashSet<String>), CardinalError> {
    // Parse first runtime argument of Cardinal
    let args: Vec<String> = env::args().collect();
    let location = args.get(1).ok_or_else(|| CardinalError {
        error: CardinalErrorType::ArgumentError,
        traceback: None,
    })?;
    let path = expand_tilde(location);

    // If provided argument is not a file or directory return an error
    if !path.is_file() && !path.is_dir() {
        return Err(CardinalError {
            error: CardinalErrorType::ArgumentTypeMismatch,
            traceback: None,
        });
    }

    let mut categories: HashSet<String> = HashSet::new();

    // Gather cards from within the file
    let cards = if path.is_file() {
        get_cards(path, &mut categories)
    } else {
        if let Ok(dir) = path.read_dir() {
            Ok(dir
                .filter_map(Result::ok)
                .map(|s| s.path())
                .filter(|s| s.is_file())
                .filter_map(|f| get_cards(f, &mut categories).ok())
                .flatten()
                .collect::<Vec<Card>>())
        } else {
            Err(CardinalError {
                error: CardinalErrorType::ArgumentError,
                traceback: None,
            })
        }
    }?;
    Ok((cards, categories))
}

fn get_cards(path: PathBuf, categories: &mut HashSet<String>) -> Result<Vec<Card>, CardinalError> {
    let file = File::open(&path).map_err(|e| CardinalError {
        error: CardinalErrorType::FileRead(path.display().to_string()),
        traceback: Some(e.to_string()),
    })?;

    // Create category
    let name = path
    .file_stem()
    .and_then(|s| s.to_str())
    .ok_or(CardinalError {
        error: CardinalErrorType::ArgumentError,
        traceback: None,
    })?
    .replace(&['-', '_'][..], " ")
    .split_whitespace()
    .map(|word| {
        let mut chars = word.chars();
        match chars.next() {
            None => String::new(),
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        }
    })
    .collect::<Vec<_>>()
    .join(" ");
    categories.insert(name.to_string());

    let reader = BufReader::new(file);

    #[derive(Debug)]
    enum Section {
        Title,
        Front,
        Back,
    }
    let mut current_section: Section = Section::Title;
    let mut card = Card::default();
    let mut cards: Vec<Card> = Vec::new();

    card.category = name;

    for line in reader.lines().filter_map(Result::ok) {
        if let Some(stripped) = line.strip_prefix("# ") {
            if !card.is_empty() {
                card.convert();
                cards.push(card.clone());
                card.clear();
                current_section = Section::Title;
            }

            let trimmed = stripped.trim().to_string();
            if !trimmed.is_empty() {
                card.title = trimmed;
            }
        } else if let Some(_) = line.strip_prefix("## ") {
            match current_section {
                Section::Title => {
                    current_section = Section::Front;
                }
                Section::Front => {
                    current_section = Section::Back;
                }
                _ => {}
            }
        } else {
            let res = if &line == "\n" { "<br>" } else { &line };
            match current_section {
                Section::Front => {
                    card.front.push_str(res);
                    card.front.push('\n');
                }
                Section::Back => {
                    card.back.push_str(res);
                    card.back.push('\n');
                }
                _ => {}
            }
        }
    }
    if !card.is_empty() {
        card.convert();
        cards.push(card);
    }

    Ok(cards)
}
