frappe.listview_settings["Role Profile"] = {
	refresh: function (listview){
		frappe.msgprint("You don't have enough permissions.");
		frappe.set_route("app");
	}
}
