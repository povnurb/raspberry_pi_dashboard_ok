//si el usuario tiene token lo enviamos index
export default function({store, redirect}){
    store.dispatch("readToken");
    if(store.state.auth){
        return redirect("/panel");
    }
}