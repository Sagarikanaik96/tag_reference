frappe.listview_settings["Company"] = {
  add_fields: ["make_organization_inactive"],
  get_indicator: function (doc) {
    var status = doc.make_organization_inactive == 0 ? "Active" : "Inactive";
    var indicator = [
      __(status),
      frappe.utils.guess_colour(status),
      "status,=," + status,
    ];
    indicator[1] = { Active: "green", Inactive: "red" }[status];
    return indicator;
  },
  onload: function (listview) {
    if(frappe.session.user != 'Administrator'){
      $('.custom-actions.hidden-xs.hidden-md').hide()
      $('[data-original-title="Refresh"]').hide()
      $('.menu-btn-group').hide()
    }
    if (!frappe.route_options && !frappe.user.has_role("Tag Admin")) {
      frappe.route_options = {
        make_organization_inactive: ["=", 0],
      };
    }
  },
};
