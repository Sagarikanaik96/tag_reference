frappe.provide("frappe.toolbar");
frappe.provide("tag_workflow");

$(document).bind('toolbar_setup', function() {
        $(".dropdown-help").empty();
        $('.navbar-home').html(`<img class="app-logo" src="/assets/tag_workflow/images/TAG-Logo.png">`);
});
