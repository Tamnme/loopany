fn f(x: &String) -> String {
    return x.clone();
}

fn main() {
    println!("{}", f(&String::from("hi")));
}
