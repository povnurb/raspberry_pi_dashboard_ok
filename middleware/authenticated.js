//si el usuario no tiene token lo enviamos a login

export default function({store, redirect}){
    store.dispatch("readToken");
    if(!store.state.auth){
        return redirect("/login");
    }
}