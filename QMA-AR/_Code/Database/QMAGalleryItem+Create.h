
#import "QMAGalleryItem.h"

@class QMAPoi;


@interface QMAGalleryItem (Create)

//If an object with that image already exists for the given POI,
//this method will update the object's caption, that is, it will
//not create a new object
+ (QMAGalleryItem *)galleryItemWithImageName:(NSString *)imageName
                                  andCaption:(NSString *)caption forPOI:(QMAPoi *)poi
                      inManagedObjectContext:(NSManagedObjectContext *)moc;

- (NSString *)description;

@end
