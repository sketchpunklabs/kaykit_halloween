import { Object3D }     from 'three';
import { GLTFLoader }   from 'tp/GLTFLoader.js';

export default class AssetLibrary{
    items = {};
    constructor(){

    }

    parseGltf( gltf, fName ){
        const key = fName.substr( 0, fName.indexOf('.') );
        const obj = gltf.scene.children[0];

        if( obj.type !== "Group" ){
            this.items[ key ] = {
                geo: obj.geometry,
                mat: obj.material,
            };
        }

        if( key === 'cauldron' ) console.log( obj );

        if( obj.children.length ){
            for( const ch of obj.children ){
                console.log( 'Sub Mesh:', ch.name );
                this.items[ ch.name ] = {
                    geo: ch.geometry,
                    mat: ch.material,
                };
            }
        }
    }

    loadCollection( url ){
        return new Promise(async ( resolve, reject )=>{
            // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            // Get response
            const res = await fetch( url );
            if( !res.ok ){ console.error( res.status ); reject( res.status ); return; }

            const json = await res.json();
            if( !json ){ console.error( 'Unable to download json' ); reject( 'Unable to download json' ); return; }

            // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            let totalItems  = 0;
            let done        = 0;
            for( const o of json ) totalItems += o.files.length;

            // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
            const loader = new GLTFLoader();
            for( const o of json ){
                for( const f of o.files ){
                    loader.load( o.url + f,
                        gltf=>{
                            this.parseGltf( gltf, f );
                            if( ++done >= totalItems ) resolve();
                        },
                        null,
                        err =>{
                            console.log( o.url + f, err );
                            if( ++done >= totalItems ) resolve();
                        },
                    );
                }
            }
        });
    }
}

// const loader = new GLTFLoader();
// loader.load( '../../assets/models/floor_dirt.gltf',
//     gltf=>{ 
//         console.log( gltf.scene.children[0] ); 
//         gltf.scene.children[0].position.set( 2, 0, 2 ); // 4x4
//         self.three.scene.add( gltf.scene.children[0] );
//     },
//     xhr =>{ console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ) },
//     err =>{ console.log( err ) },
// );