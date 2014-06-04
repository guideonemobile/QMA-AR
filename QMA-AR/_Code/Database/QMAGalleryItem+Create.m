
#import "QMAGalleryItem+Create.h"
#import "QMAPoi.h"


@implementation QMAGalleryItem (Create)

+ (QMAGalleryItem *)galleryItemWithImageName:(NSString *)imageName
                                  andCaption:(NSString *)caption
                                      forPOI:(QMAPoi *)poi
                      inManagedObjectContext:(NSManagedObjectContext *)moc {
    
    QMAGalleryItem *item;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMAGalleryItem"];
    request.predicate = [NSPredicate predicateWithFormat:@"image = %@ AND poi = %@", imageName, poi];
    NSArray *matches = [moc executeFetchRequest:request error:nil];
    
    if (!matches) {
        QMALog(@"Error: Fetch request failed");
    } else if ([matches count] > 1) {
        QMALog(@"Error: More than one Gallery Item with the image '%@' for poi '%@'", imageName, poi.label);
    } else if ([matches count] == 1) {
        QMALog(@"A Gallery Item with image '%@' already exists for poi '%@'. Caption updated.", imageName, poi.label);
        item = [matches firstObject];
    } else {
        item = [NSEntityDescription insertNewObjectForEntityForName:@"QMAGalleryItem"
                                             inManagedObjectContext:moc];
        item.image = imageName;
    }
    
    item.caption = caption;
    
    return item;
}

- (NSString *)description {
    return [NSString stringWithFormat:@"<%@: %p, %@>", [self class], self, @{@"Image":self.image, @"Caption":self.caption}];
}

@end
