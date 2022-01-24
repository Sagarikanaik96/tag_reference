frappe.listview_settings["Report"] = {
	refresh: function (listview){
		let roles = frappe.user_roles;
		if(!["Tag Admin", "Tag User"].includes(roles)){
			frappe.msgprint("You don't have enough permissions.");
			frappe.set_route("app");
		}
	}
}
