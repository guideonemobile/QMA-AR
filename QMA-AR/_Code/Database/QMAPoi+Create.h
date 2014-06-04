
#import "QMAPoi.h"

@class QMATarget;


@interface QMAPoi (Create)

//If an object with that name already exists for the given target,
//this method will update the object's properties, that is, it will
//not create a new object
+ (QMAPoi *)poiWithLabel:(NSString *)label
          andColorNumber:(NSNumber *)color
            andImageName:(NSString *)imageName
            andAudioName:(NSString *)audioName
           andPersonName:(NSString *)personName
         andGalleryItems:(NSArray *)galleryItems
               forTarget:(QMATarget *)target
  inManagedObjectContext:(NSManagedObjectContext *)moc;

- (NSString *)description;

@end
