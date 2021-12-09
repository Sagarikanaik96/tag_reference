frappe.listview_settings['User'] = {
	refresh: function(listview){
		let view = listview;
		let children = view.$list_head_subject[0].children;
		for(var c in children){
			if(children[c].innerHTML && children[c].innerHTML.search("\n\t\t\t\t\t\n\t\t\t\t\t\t<span>Name</span>\n\t\t\t\t") >= 0){
				children[c].innerHTML = "\n\t\t\t\t\t\n\t\t\t\t\t\t<span>Email</span>\n\t\t\t\t";
			}
		}
	}
};
