use pulldown_cmark::{html, Options, Parser};
use serde::Serialize;

#[derive(Default, Clone, Debug, Serialize)]
pub struct Card {
    // The title of the h1 element
    pub title: String,
    // The body of the first h2 element
    pub front: String,
    // The body of the second h2 element
    pub back: String,
    // Category
    pub category: String,
}
impl Card {
    pub fn clear(&mut self) {
        self.title.clear();
        self.front.clear();
        self.back.clear();
    }
    pub fn is_empty(&self) -> bool {
        self.title.is_empty() || (self.front.is_empty() && self.back.is_empty())
    }
    pub fn convert(&mut self) {
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
