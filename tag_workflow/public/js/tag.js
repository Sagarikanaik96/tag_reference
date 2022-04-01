frappe.provide("frappe.toolbar");
frappe.provide("tag_workflow");


$(document).bind('toolbar_setup', function() {
        $(".dropdown-help").empty();
        $('.navbar-home').html(`<img class="app-logo" src="/assets/tag_workflow/images/TAG-Logo.png">`);
			if(window.screen.width>768) {
				$('.navbar-home').html(`<img class="app-logo" src="/assets/tag_workflow/images/TAG-Logo.png">`);
			}
			else {
				$('.navbar-home').html(`<img class="app-logo" src="/assets/tag_workflow/images/TAG-Logo-Emblem.png">`);
			}

	frappe.ui.toolbar.route_to_company = function() {
		frappe.set_route('Form', 'Company', frappe.boot.tag.tag_user_info.company);
	};
});

$(document).ready(function(){
	if(frappe.boot && frappe.boot.home_page!=='setup-wizard'){
		$(".main-section").append(frappe.render_template("tag"));
	}
});


frappe.provide("tag_workflow.workflow");
frappe.ui.form.States = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.state_fieldname = frappe.workflow.get_state_fieldname(this.frm.doctype);

		// no workflow?
		if(!this.state_fieldname)
			return;

		this.update_fields = frappe.workflow.get_update_fields(this.frm.doctype);

		var me = this;
		$(this.frm.wrapper).bind("render_complete", function() {
			me.refresh();
		});
	},

	setup_help: function() {
		var me = this;
		this.frm.page.add_action_item(__("Help"), function() {
			frappe.workflow.setup(me.frm.doctype);
			var state = me.get_state();
			var d = new frappe.ui.Dialog({
				title: "Workflow: "
					+ frappe.workflow.workflows[me.frm.doctype].name
			})
			var next_html = $.map(frappe.workflow.get_transitions(me.frm.doctype, state),
				function(r) {
					return r.action.bold() + __(" by Role ") + r.allowed;
				}).join(", ") || __("None: End of Workflow").bold();

			$(d.body).html("<p>"+__("Current status")+": " + state.bold() + "</p>"
				+ "<p>"+__("Document is only editable by users of role")+": "
					+ frappe.workflow.get_document_state(me.frm.doctype,
						state).allow_edit.bold() + "</p>"
				+ "<p>"+__("Next actions")+": "+ next_html +"</p>"
				+ (me.frm.doc.__islocal ? ("<div class='alert alert-info'>"
					+__("Workflow will start after saving.")+"</div>") : "")
				+ "<p class='help'>"+__("Note: Other permission rules may also apply")+"</p>"
				).css({padding: '15px'});
			d.show();
		}, true);
	},

	refresh: function() {
		// hide if its not yet saved
		if(this.frm.doc.__islocal) {
			this.set_default_state();
			return;
		}
		// state text
		var state = this.get_state();

		if(state) {
			// show actions from that state
			this.show_actions(state);
		}

	},

	show_actions: function(state) {
		var added = false;
		var me = this;
		this.frm.page.clear_actions_menu();

		// if the loaded doc is dirty, don't show workflow buttons
		if (this.frm.doc.__unsaved===1) {
			return;
		}

		frappe.workflow.get_transitions(this.frm.doc, state).then(transitions => {
			$.each(transitions, function(i, d) {
				if(frappe.user_roles.includes(d.allowed)) {
					added = true;
					me.frm.page.add_action_item(__(d.action), function() {
						var action = d.action;
						// capture current state
						if(action  == "Reject"){
							me.frm.doc.__tran_state = d;
						}else{
							unreject(me,d)
						}
					});
				}
			});
		});

		if(added) {
			this.frm.page.btn_primary.addClass("hide");
			this.frm.toolbar.current_status = "";
			this.setup_help();
		}
	},

	set_default_state: function() {
		var default_state = frappe.workflow.get_default_state(this.frm.doctype, this.frm.doc.docstatus);
		if(default_state) {
			this.frm.set_value(this.state_fieldname, default_state);
		}
	},

	get_state: function() {
		if(!this.frm.doc[this.state_fieldname]) {
			this.set_default_state();
		}
		return this.frm.doc[this.state_fieldname];
	},

	bind_action: function() {
		var me = this;
		this.dropdown.on("click", "[data-action]", function() {
			me._bind = '0'
		})
	},

});

/*------------------------------------------------*/
frappe.form.link_formatters['Employee'] = function(value, doc) {
	if(doc && doc.employee_name && doc.employee_name !== value) {
		return value ? doc.employee_name + ': ' + value : doc.employee_name;
	} else {
		return value;
	}
}
function unreject(me,d) {
	var doc_before_action = copy_dict(me.frm.doc);
	// set new state
	var next_state = d.next_state;
	me.frm.doc[me.state_fieldname] = next_state;

	var new_state = frappe.workflow.get_document_state(me.frm.doctype, next_state);
	new_state.update_field = me.state_fieldname;
	var new_docstatus = cint(new_state.doc_status);

	if(new_state.update_field) {
		me.frm.set_value(new_state.update_field, "");
		me.frm.set_value(new_state.update_field, new_state.update_value);
		cur_frm.refresh_field(new_state.update_field);
	}

	// revert state on error
	var on_error = function() {
		// reset in locals
		frappe.model.add_to_locals(doc_before_action);
		me.frm.refresh();
	}

	// success - add a comment
	var success = function() {
		console.log("sahil is here");
	}

	me.frm.doc.__tran_state = d;

	if(new_docstatus==1 && me.frm.doc.docstatus==0) {
		me.frm.savesubmit(null, success, on_error);
	} else if(new_docstatus==0 && me.frm.doc.docstatus==0) {
		me.frm.save("Save", success, null, on_error);
	} else if(new_docstatus==1 && me.frm.doc.docstatus==1) {
		me.frm.save("Update", success, null, on_error);
	} else if(new_docstatus==2 && me.frm.doc.docstatus==1) {
		me.frm.savecancel(null, success, on_error);
	} else {
		frappe.msgprint(__("Document Status transition from ") + me.frm.doc.docstatus + " "
			+ __("to") +
			new_docstatus + " " + __("is not allowed."));
		frappe.msgprint(__("Document Status transition from {0} to {1} is not allowed", [me.frm.doc.docstatus, new_docstatus]));
		return 0;
	}
}
/*----------fields-----------*/
tag_workflow.UpdateField = function update_field(frm, field){
	if(field == "map"){
		frm.set_value("enter_manually", 0);
		frm.set_df_property('map','hidden',0);
	}else{
		frm.set_value("search_on_maps", 0);
		frm.set_df_property('map','hidden',1)
	}
}
/*----------maps------------*/
tag_workflow.Map = `
	<!doctype html>
	<html>
		<head>
			<meta charset="utf-8">
		</head>
		<body>
			<input class="form-control" placeholder="Search a location" id="autocomplete-address" style="height: 30px;margin-bottom: 15px;">
			<div class="tab-content" title="map" style="text-align: center;padding: 4px;">
				<div id="map" style="height:450px;border-radius: var(--border-radius-md);"></div>
			</div>

			<script src="https://maps.googleapis.com/maps/api/js?key=${frappe.boot.tag.tag_user_info.api_key}&amp;libraries=places&amp;callback=initPlaces" async="" defer=""></script>
			<script>
				let autocomplete;
				let placeSearch;
				let place;
				let componentForm = {
					street_number: "long_name",
					route: "long_name",
					locality: "long_name",
					administrative_area_level_1: "long_name",
					country: "long_name",
					postal_code: "long_name"
				};

				window.initPlaces = function() {
					let default_location = { lat: 38.889248, lng: -77.050636 };
					map = new google.maps.Map(document.getElementById("map"), {
						zoom: 8,
						center: default_location,
						mapTypeControl: false,
					});

					marker = new google.maps.Marker({map,});
					geocoder = new google.maps.Geocoder();

					if(jQuery( "#autocomplete-address" ).length ){
						autocomplete = new google.maps.places.Autocomplete(
							document.getElementById( "autocomplete-address" ),
							{ types: [ "geocode" ] }
						);
						autocomplete.addListener( "place_changed", fillInAddress );
					}
				};

				function fillInAddress() {
					place = autocomplete.getPlace();
					if(!place.formatted_address && place.name){
						let val = parseFloat(place.name);
						if(!isNaN(val) && val <= 90 && val >= -90){
							 let latlng = place.name.split(",");
							 default_location = { lat: parseFloat(latlng[0]), lng: parseFloat(latlng[1]) };
							 geocode({ location: default_location });
						}
					}else{
						make_address(place, "auto");
						geocode({ address: place.formatted_address });
					}
				}

				function geolocate() {
					if(navigator.geolocation) {
						navigator.geolocation.getCurrentPosition( function( position ) {
							var geolocation = {
								lat: position.coords.latitude,
								lng: position.coords.longitude
							};
							var circle = new google.maps.Circle({
								center: geolocation,
								radius: position.coords.accuracy
							});
							autocomplete.setBounds( circle.getBounds() );
						});
					}
				}

				jQuery( "#autocomplete-address" ).on( "focus", function() {
					geolocate();
				});

				function geocode(request) {
					geocoder.geocode(request).then((result) => {
						const { results } = result;
						map.setCenter(results[0].geometry.location);
						marker.setPosition(results[0].geometry.location);
						marker.setMap(map);
						return results;
					}).catch((e) => {
						alert("Geocode was not successful for the following reason: " + e);
					});
				}

				function make_address(value, key){
					let data = {name:"",street_number:"",route:"",locality:"",administrative_area_level_1:"",country:"",postal_code:"",lat:"",lng:"",plus_code:""};
					if(key == "auto"){
						data["lat"] = value.geometry.location.lat();
						data["lng"] = value.geometry.location.lng();
						data["name"] = value.formatted_address;
						for(let i = 0; i < value.address_components.length; i++) {
							let addressType = value.address_components[i].types[0];
							if(componentForm[addressType]) {
								let val = value.address_components[i][componentForm[addressType]];
								let key = value.address_components[i].types[0];
								data[key] = val;
							}
						}
					}else{
						let values = value.results[0] || [];
						data["lat"] = (values ? values.geometry.location.lat() : "");
						data["lng"] = (values ? values.geometry.location.lng() : "");
						data["name"] = value.formatted_address;
						for(let i = 0; i < values.address_components.length; i++) {
							let addressType = values.address_components[i].types[0];
							if(componentForm[addressType]) {
								let val = values.address_components[i][componentForm[addressType]];
								let key = values.address_components[i].types[0];
								data[key] = val;
                                                        }
						}
					}
					update_address(data)
				}
				function update_address(data){
					if (cur_frm.doc.doctype==="Employee"){
						set_value_employee(data)
					}
					else if(cur_frm.doc.doctype==="Lead"){
						set_value_lead(data)
					}
					else if (cur_frm.doc.doctype=="Contact"){
						set_value_contact(data)
					}
					else if(cur_frm.doc.doctype=="Company"){
						set_value_company(data)
					}
				}
				function set_value_employee(data){
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "street_address", document.getElementById("autocomplete-address").value);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
				}
				function set_value_lead(data){
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address_lines_1", document.getElementById("autocomplete-address").value);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address_lines_2", (data["street_number"]+" "+data["route"]));
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state_2", data["administrative_area_level_1"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city_or_town", data["locality"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
				}
				function set_value_contact(data){
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "contact_address", document.getElementById("autocomplete-address").value);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
				}
				function set_value_company(data){
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address", document.getElementById("autocomplete-address").value);
				}
			</script>
		</body>
	</html>
`
tag_workflow.SetMap = function (frm) {
	 setTimeout(frm.set_df_property("map", "options", tag_workflow.Map), 500);
	 frm.set_df_property('map','hidden',1)
}
