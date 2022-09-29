// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt
frappe.ui.form.on('Job Site', {
	refresh: function(frm){
		$('.form-footer').hide()
		$('[data-original-title="Menu"]').hide()
		maps();
		hide_fields(frm)
		show_addr(frm)
		frm.get_docfield('address').label ='Complete Address';
		frm.refresh_field('address')
		if(frm.doc.__islocal==1){
			cancel_jobsite(frm);
			frm.set_df_property('job_site_contact','hidden', 1);
			let len_history = frappe.route_history.length;
			if(frappe.route_history.length>1 && frappe.route_history[len_history-2][1]=='Job Order'){
				frm.set_value('company',sessionStorage.getItem('joborder_company'));
				frm.set_df_property('company', 'read_only', 1);
				sessionStorage.removeItem('joborder_company');
			}else if(frappe.route_history.length>1 && frappe.route_history[len_history-2][1]=='Company'){
				frm.set_value('company',frappe.route_history[len_history-2][2]);
				frm.set_df_property('company', 'read_only', 1);
			}
			else if(frappe.boot.tag.tag_user_info.company_type == 'Hiring' || frappe.boot.tag.tag_user_info.company_type == 'Exclusive Hiring'){
				frm.set_value('company', frappe.boot.tag.tag_user_info.company);
				frm.set_df_property('company', 'read_only', 1);
			}else{
				frm.set_value('company', '');
				frm.set_query('company', function(){
					return{
						filters: {parent_staffing:frappe.boot.tag.tag_user_info.company}
					}
				});
			}
		}
	},

	setup: function(frm){
		get_users(frm)
	},
	search_on_maps: function(frm){
		if(cur_frm.doc.search_on_maps == 1){
			update_field(frm, "map");
			hide_fields(frm)
			show_addr(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.manually_enter==0){
			cur_frm.set_df_property('lat','hidden',1);
			cur_frm.set_df_property('lng','hidden',1);
			show_addr(frm);
		}
	},

	manually_enter: function(frm){
		if(cur_frm.doc.manually_enter == 1){
			update_field(frm, "manually");
			show_fields(frm);
		}
		show_addr(frm);
	},
	validate: function (frm) {
		if(frm.doc.__islocal==1){	
			if (frm.doc.job_site.indexOf('-') > 0){
				frm.set_value("job_site_name",frm.doc.job_site.split('-')[0]);
			}else{
				frm.set_value("job_site_name",frm.doc.job_site);
			}
			cur_frm.refresh_field("job_site_name");
			frappe.call({
				"method": "tag_workflow.tag_workflow.doctype.job_site.job_site.checkingjobsiteandjob_site_contact",
				"args": {"job_site_name": frm.doc.job_site_name,
						"job_site_contact":frm.doc.job_site_contact,
						},
				"async": 0,
				"callback": function(r){
					if (!(r.message)){
						frappe.msgprint({
							message: __("Job site already exists for this contact"),
							title: __("Error"),
							indicator: "orange",
						  });
						frappe.validated = false
					}
				}
			})
			frappe.call({
				"method": "tag_workflow.utils.doctype_method.checkingjobsite",
				"args": {"job_site": frm.doc.job_site,
	
						},
				"async": 0,
				"callback": function(r){
					frm.set_value("job_site", r.message);
					cur_frm.refresh_field("job_site");
				}
			});
		}
		
	},
	job_site_contact: function(frm){
		if(!frm.doc.job_site_contact){
			frm.set_value('contact_email', '');
			frm.set_value('contact_name', '');
			frm.set_value('phone_number', '');
		}
	},
	company: function(frm){
		if(frm.doc.company){
			frm.set_df_property('job_site_contact','hidden', 0);
			get_jobsite_contact(frm);
		}
		else{
			frm.set_value('job_site_contact', '');
			frm.set_value('contact_email', '');
			frm.set_value('contact_name', '');
			frm.set_value('phone_number', '');
			frm.set_df_property('job_site_contact','hidden', 1);
		}
	},

});

/*----------fields-----------*/
function update_field(frm, field){
	if(field == "map"){
		frm.set_value("manually_enter", 0);
	}else{
		frm.set_value("search_on_maps", 0);
	}
}


/*----------maps------------*/
let html = `
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
		</body>
	</html>
`

function maps(){
	 setTimeout(()=>{
	 	$(cur_frm.fields_dict.html.wrapper).html(html)
	 	siteMap();
	 }, 500);
	 if(cur_frm.is_new())
	 	$('.frappe-control[data-fieldname="map"]').html('')
}


function cancel_jobsite(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Job Site");
	});
}
function get_jobsite_contact(frm){
	frappe.db.get_value("User", {"company": frm.doc.company}, ['name'], function(r){
		if(Object.keys(r).length==0){
			frappe.db.get_value('Company', {'name': frm.doc.company}, ['contact_name', 'phone_no', 'email'], function(res){
				frm.set_df_property('job_site_contact', 'hidden', 1);
				if(Object.values(res).every(x => x === null)){
					let message = 'Either create a user or fill in primary contact details of <b>'+frm.doc.company+'</b> to create a job site.'
					frappe.msgprint(__(message));
				}else{
					frm.set_value('contact_name', res.contact_name);
					frm.set_value('contact_email', res.email);
					frm.set_value('phone_number', res.phone_no);
				}
			});
		}
		else{
			get_users(frm);
		}
	});
}

function get_users(frm){
	frm.set_query('job_site_contact', function(doc) {
		return {
			query: "tag_workflow.tag_data.job_site_contact",
			filters: {'job_order_company': doc.company}
		}
	});

}
function siteMap() {
    let autocomplete;
    let place;
    let componentForm = {
        street_number: "long_name",
        route: "long_name",
        locality: "long_name",
        administrative_area_level_1: "long_name",
        country: "long_name",
        postal_code: "long_name"
    };


    let default_location = {
        lat: 38.889248,
        lng: -77.050636
    };
    if (cur_frm.doc.lat && cur_frm.doc.lng) {
        default_location = {
            lat: Number(cur_frm.doc.lat),
            lng: Number(cur_frm.doc.lng)
        };
    }

    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: default_location,
        mapTypeControl: false,
    });

    const marker = new google.maps.Marker({
        map,
    });
    const geocoder = new google.maps.Geocoder();
    geocode({
        location: default_location
    });

    if (jQuery("#autocomplete-address").length) {
        autocomplete = new google.maps.places.Autocomplete(
            document.getElementById("autocomplete-address"), {
                types: ["geocode"]
            }
        );
        autocomplete.addListener("place_changed", fillInAddress);
    }


    function fillInAddress() {
        place = autocomplete.getPlace();
        if (!place.formatted_address && place.name) {
            let val = parseFloat(place.name);
            if (!isNaN(val) && val <= 90 && val >= -90) {
                let latlng = place.name.split(",");
                default_location = {
                    lat: parseFloat(latlng[0]),
                    lng: parseFloat(latlng[1])
                };
                geocode({
                    location: default_location
                });
            }
        } else {
            make_addr(place, "auto",componentForm);
            geocode({
                address: place.formatted_address
            });
        }
    }
    function geocode(request) {
        geocoder.geocode(request).then((result) => {
            const {
                results
            } = result;
            map.setCenter(results[0].geometry.location);
            marker.setPosition(results[0].geometry.location);
            marker.setMap(map);
            return results;
        }).catch((e) => {
            alert("Geocode was not successful for the following reason: " + e);
        });
    }
}
function make_addr(value, key, componentForm) {
    let data = {
        name: "",
        street_number: "",
        route: "",
        locality: "",
        administrative_area_level_1: "",
        country: "",
        postal_code: "",
        lat: "",
        lng: "",
        plus_code: ""
    };
    if (key == "auto") {
        data["lat"] = value.geometry.location.lat();
        data["lng"] = value.geometry.location.lng();
        data["name"] = value.formatted_address;
        makes(value,key,componentForm,data);
    } else {
        let values = value.results[0] || [];
        data["lat"] = (values ? values.geometry.location.lat() : "");
        data["lng"] = (values ? values.geometry.location.lng() : "");
        data["name"] = value.formatted_address;
        makes(value,key,componentForm,data);
    }
    update_data(data)
}
function makes(value, _key, componentForm, data) {
    for (let i in value.address_components) {
        let addressType = value.address_components[i].types[0];
        if (componentForm[addressType]) {
            let val = value.address_components[i][componentForm[addressType]];
            let k = value.address_components[i].types[0];
            data[k] = val;
        }
    }
}
function update_data(data) {
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "job_site", document.getElementById("autocomplete-address").value);
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address", document.getElementById("autocomplete-address").value);
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "lat", data["lat"]);
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "lng", data["lng"]);
    frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
}
function hide_fields(frm){
	frm.set_df_property('city','hidden',frm.doc.city && frm.doc.enter_manually ==1 ?0:1);
	frm.set_df_property('state','hidden',frm.doc.state && frm.doc.enter_manually ==1?0:1);
	frm.set_df_property('zip','hidden',frm.doc.zip && frm.doc.enter_manually ==1?0:1);
}
function show_fields(frm){
	frm.set_df_property('city','hidden',0);
	frm.set_df_property('state','hidden',0);
	frm.set_df_property('zip','hidden',0);
}
function show_addr(frm){
    if(frm.doc.search_on_maps){
        frm.get_docfield('address').label ='Complete Address';
    }else if(frm.doc.manually_enter){
        frm.get_docfield('address').label ='Address';
    }
    frm.refresh_field('address');
}