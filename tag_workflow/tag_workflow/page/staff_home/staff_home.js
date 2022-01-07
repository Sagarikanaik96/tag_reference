let company = frappe.boot.tag.tag_user_info.company;
let company_type = frappe.boot.tag.tag_user_info.company_type;

frappe.pages['staff-home'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Home',
		single_column: true
	});

	wrapper.staff_home = new frappe.StaffHome(wrapper, page);
}

frappe.StaffHome = Class.extend({
	init: function(wrapper, page) {
		var me = this;
		this.parent = wrapper;
		this.page = this.parent.page;
		setTimeout(function() {
			me.setup(wrapper, page);
		}, 1000);
	},
	setup: function(wrapper, page){
		var me = this;
		this.body = $('<div></div>').appendTo(this.page.main);
		$(frappe.render_template('staff_home', "")).appendTo(this.body);
		me.make_data(wrapper, page);
		me.init_map(wrapper, page);
	},
	init_map: function(wrapper, page){
		var me = this;
		var center = { lat: 38.889248, lng: -77.050636 };
		me.map = new google.maps.Map(document.getElementById('map'), {
			zoom: 8,
			center: center
		});
	},
	make_data: function(wrapper, page){
		var me = this;
		me.update_job_order(wrapper, page);
	},

	update_job_order: function(wrapper, page){
		var me = this;
		frappe.call({
			method: "tag_workflow.tag_workflow.page.staff_home.staff_home.get_order_info",
			args: {"company": company},
			callback: function(r){
				var location = r.message.location;
				var order = r.message.order;
				me.update_map(wrapper, page, location);
				me.update_order(wrapper, page, order);
			}
		});
	},
	update_map: function(wrapper, page, location){
		var me = this;
		let locations = location;
		for(let c in locations) {
			let marker = new google.maps.Marker({
				position: new google.maps.LatLng(locations[c][1], locations[c][2]),
				map: me.map,
				title: locations[c][0]
			});
			console.log(marker);
		}
	},
	update_order: function(wrapper, page, order){
		console.log(order);
	}
});
