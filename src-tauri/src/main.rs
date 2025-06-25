// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, fs::File, io::{BufRead, BufReader}, path::{Path, PathBuf}};

use pulldown_cmark::{html, Options, Parser};
use serde::Serialize;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_cards])
        .run(tauri::generate_context!())
        .expect("Error running tauri backend");
}

#[tauri::command]
fn read_cards()->Result<Vec<Card>, CardinalError>{
    // Parse first runtime argument of Cardinal
    let args: Vec<String> = env::args().collect();
    let location = args.get(1).ok_or_else(|| CardinalError {
        error: CardinalErrorType::ArgumentError,
        traceback: None
    })?;
    let path = expand_tilde(location);
    
    // If provided argument is not a file or directory return an error
    if !path.is_file() && !path.is_dir(){
        return Err(CardinalError { error: CardinalErrorType::ArgumentTypeMismatch, traceback: None })
    }

    // Gather cards from within the file
    if path.is_file() {
        return get_cards(path)
    } 

    Ok(vec![])
}

fn get_cards(path: PathBuf)->Result<Vec<Card>, CardinalError>{
    let file = File::open(&path).map_err(|e| CardinalError {
        error: CardinalErrorType::FileRead(path.display().to_string()),
        traceback: Some(e.to_string())
    })?;
    let reader = BufReader::new(file);

    
    enum Section {
        Title,
        Front,
        Back,
    }
    let mut current_section: Section = Section::Title;
    let mut card = Card::default();
    let mut cards: Vec<Card> = Vec::new();

    for line in reader.lines().filter_map(Result::ok) {
        if let Some(stripped) = line.strip_prefix("# ") {
            if !card.is_empty() {
                card.convert();
                cards.push(card.clone());
                card.clear();
            }

            let trimmed = stripped.trim().to_string();
            if !trimmed.is_empty() {
                card.title = trimmed;
            }
        } else if let Some(_) = line.strip_prefix("## ") {
            match current_section {
                Section::Title => {
                    current_section = Section::Front;
                },
                Section::Front => {
                    current_section = Section::Back;
                },
                _ => {}
            }

        } else {
            match current_section {
                Section::Front => {
                    card.front.push_str(&line);
                    card.front.push('\n');
                },
                Section::Back => {
                    card.back.push_str(&line);
                    card.back.push('\n');
                },
                _ => {}
            }
        }
    }

    Ok(cards)
}



#[derive(Default, Clone, Debug, Serialize)]
struct Card {
    // The title of the h1 element
    title: String,
    // The body of the first h2 element
    front: String,
    // The body of the second h2 element
    back: String
}
impl Card {
    fn clear(&mut self){
        self.title.clear();
        self.front.clear();
        self.back.clear();
    }
    fn is_empty(&self) -> bool {
        self.title.is_empty() && self.front.is_empty() && self.back.is_empty()
    }
    fn convert(&mut self){
        let options = Options::all();

        let parser = Parser::new_ext(&self.front, options);
        let mut html_output = String::new();
        html::push_html(&mut html_output, parser);
        self.front = html_output.clone();

        let parser = Parser::new_ext(&self.back, options);
        html_output.clear();
        html::push_html(&mut html_output, parser);
        self.back = html_output;
    }
}


#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "message")]
enum CardinalErrorType {
    ArgumentError,
    ArgumentTypeMismatch,
    FileExists(String),
    FileRead(String),
    Other,
}
#[derive(Debug, Serialize)]
struct CardinalError {
    error: CardinalErrorType,
    traceback: Option<String>
}



fn expand_tilde<T: AsRef<Path>>(path: T)->PathBuf{
    let path = path.as_ref();
    if let Ok(p) = path.strip_prefix("~/"){
        if let Some(home) = get_home_dir() {
            return home.join(p)
        }
    }
    path.to_path_buf()
}
fn get_home_dir() -> Option<PathBuf> {
    #[cfg(unix)]
    {
        if let Ok(home) = env::var("HOME") {
            return Some(PathBuf::from(home))
        }
        //TODO: Later add fallbacks for homedirs
        None
    }
    #[cfg(windows)]
    {
        env::var("USERPROFILE").ok().map(PathBuf::from)
    }
}
